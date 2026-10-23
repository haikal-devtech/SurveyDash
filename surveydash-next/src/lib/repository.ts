import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { datasetCondition, type Dataset } from './response-quality';
import { recordActivity } from './workspace-activity';
import {
  attributionColumns,
  attributionJoin,
  parseAttribution,
  resolveReferral,
} from './surveyor-repository';
import type { Answer, AuditEntry, SavedTemplate, Submission, Survey, TemplateCategory } from './types';
import {
  assertAcceptingResponses,
  assertSchemaCompatible,
  surveyInputSchema,
  validateAnswers,
} from './model';
import { defaultWidgets } from './templates';
import { decodeTemplate, mapPresentation, systemTemplates, templateFromSurvey } from './template-model';

type SqlRow = Record<string, string | number | null>;
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const parseSurvey = (row: SqlRow): Survey => ({
  ...JSON.parse(String(row.payload)),
  responseCount: Number(row.response_count ?? 0),
});
const parseSubmission = (row: SqlRow): Submission => ({
  id: String(row.id),
  surveyId: String(row.survey_id),
  submittedAt: String(row.submitted_at),
  answers: JSON.parse(String(row.answers)),
  questionSnapshot: JSON.parse(String(row.snapshot)),
  revision: Number(row.revision),
  surveyor: parseAttribution(row),
});

export async function listSurveys(ownerId: string, includeArchived = false): Promise<Survey[]> {
  return (
    await getDb()
      .prepare(
        'SELECT surveys.*, (SELECT count(*) FROM submissions WHERE survey_id = surveys.id) AS response_count FROM surveys WHERE owner_id = ? ORDER BY updated_at DESC',
      )
      .all(ownerId)
  )
    .map((row) => parseSurvey(row as SqlRow))
    .filter((s) => includeArchived || (!s.archivedAt && !s.deletedAt));
}
export async function getSurvey(id: string, ownerId: string): Promise<Survey> {
  const row = await getDb()
    .prepare(
      'SELECT surveys.*, (SELECT count(*) FROM submissions WHERE survey_id = surveys.id) AS response_count FROM surveys WHERE id = ? AND owner_id = ?' +
        getDb().lockSuffix,
    )
    .get(id, ownerId);
  if (!row) throw new AppError('Survei tidak ditemukan.', 404);
  return parseSurvey(row as SqlRow);
}
export async function getSurveyByToken(token: string, collecting = false): Promise<Survey> {
  const row = await getDb()
    .prepare(
      'SELECT * FROM surveys WHERE token = ?' +
        (collecting ? getDb().collectionLockSuffix : getDb().lockSuffix),
    )
    .get(token);
  if (!row) throw new AppError('Form tidak ditemukan.', 404);
  return parseSurvey(row as SqlRow);
}
async function insertSurvey(survey: Survey) {
  await getDb()
    .prepare(
      'INSERT INTO surveys(id, owner_id, token, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(survey.id, survey.ownerId, survey.token, JSON.stringify(survey), survey.createdAt, survey.updatedAt);
}
export async function listTemplates(ownerId: string, includeArchived = false): Promise<SavedTemplate[]> {
  return (
    await getDb().prepare('SELECT * FROM templates WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId)
  )
    .map(decodeTemplate)
    .filter((t) => includeArchived || !t.archivedAt);
}
export async function getTemplate(id: string, ownerId: string): Promise<SavedTemplate> {
  const builtIn = systemTemplates.find((t) => t.id === id);
  if (builtIn) return structuredClone(builtIn);
  const row = await getDb()
    .prepare('SELECT * FROM templates WHERE id = ? AND owner_id = ?' + getDb().lockSuffix)
    .get(id, ownerId);
  if (!row) throw new AppError('Template tidak ditemukan.', 404);
  return decodeTemplate(row);
}
export async function createSurvey(ownerId: string, title: string, templateId: string): Promise<Survey> {
  const template = await getTemplate(templateId, ownerId);
  if (template.archivedAt) throw new AppError('Pulihkan template sebelum menggunakannya.');
  if (template.category === 'presentation')
    throw new AppError('Pilih template form atau paket survei untuk membuat survei baru.');
  const now = new Date().toISOString();
  const survey: Survey = {
    id: randomUUID(),
    ownerId,
    title: title.trim(),
    description:
      template.settings.description ||
      'Terima kasih telah meluangkan waktu untuk memberikan masukan. Jawaban Anda membantu kami meningkatkan kualitas layanan.',
    institution: template.settings.institution,
    status: 'draft',
    visibility: 'link',
    kind: template.kind,
    token: randomUUID().replaceAll('-', ''),
    questions: structuredClone(template.questions),
    widgets:
      template.category === 'survey'
        ? structuredClone(template.widgets)
        : templateId === 'blank'
          ? []
          : defaultWidgets(template.kind),
    version: 1,
    target: template.settings.target,
    createdAt: now,
    updatedAt: now,
    demo: false,
  };
  // Custom saved templates can have entirely different question IDs.
  survey.widgets = survey.widgets.filter(
    (w) => !w.questionId || survey.questions.some((q) => q.id === w.questionId),
  );
  surveyInputSchema.parse(survey);
  await insertSurvey(survey);
  return survey;
}
export async function updateSurvey(
  id: string,
  ownerId: string,
  input: unknown,
  actor = ownerId,
): Promise<Survey> {
  const parsed = surveyInputSchema.parse(input);
  const db = getDb();
  return db.transaction(async () => {
    const before = await getSurvey(id, ownerId);
    if (before.version !== parsed.version)
      throw new AppError('Survei sudah diperbarui di tab lain. Muat ulang sebelum menyimpan.', 409);
    if ((before.archivedAt || before.deletedAt) && parsed.status === 'open')
      throw new AppError('Pulihkan survei sebelum membuka form.');
    if (process.env.ENFORCE_FREE_LIMITS === 'true' && parsed.status === 'open' && before.status !== 'open') {
      await db.lockOwner(ownerId);
      const { getUsage } = await import('./workspace-repository');
      const { assertCapacity } = await import('./plans');
      const usage = await getUsage(ownerId);
      assertCapacity(usage.activeSurveys, usage.activeLimit, 'survei aktif');
    }
    const hasResponses = !!(await db
      .prepare('SELECT id FROM submissions WHERE survey_id = ? LIMIT 1')
      .get(id));
    assertSchemaCompatible(before, parsed, hasResponses);
    const after: Survey = {
      ...before,
      ...parsed,
      version: before.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db
      .prepare('UPDATE surveys SET payload = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(after), after.updatedAt, id, ownerId);
    await recordActivity(ownerId, actor, 'survey.updated', id, { version: after.version });
    return after;
  });
}
export async function saveTemplate(
  survey: Survey,
  name: string,
  category: TemplateCategory = 'form',
  description = '',
) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const template = templateFromSurvey(survey, { name, category, description }, id, createdAt);
  await getDb()
    .prepare('INSERT INTO templates VALUES (?, ?, ?, ?, ?)')
    .run(id, survey.ownerId, name, JSON.stringify(template), createdAt);
  return template;
}
export async function updateTemplate(
  id: string,
  ownerId: string,
  changes: { name?: string; description?: string; archived?: boolean },
) {
  return getDb().transaction(async () => {
    const current = await getTemplate(id, ownerId);
    if (current.builtIn)
      throw new AppError('Template bawaan tidak dapat diubah. Buat salinan terlebih dahulu.', 403);
    const after = {
      ...current,
      name: changes.name ?? current.name,
      description: changes.description ?? current.description,
      archivedAt:
        changes.archived === undefined
          ? current.archivedAt
          : changes.archived
            ? new Date().toISOString()
            : null,
    };
    await getDb()
      .prepare('UPDATE templates SET name = ?, payload = ? WHERE id = ? AND owner_id = ?')
      .run(after.name, JSON.stringify(after), id, ownerId);
    return after;
  });
}
export async function duplicateTemplate(id: string, ownerId: string, name: string) {
  const source = await getTemplate(id, ownerId);
  const template: SavedTemplate = {
    ...source,
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    archivedAt: null,
    builtIn: false,
  };
  await getDb()
    .prepare('INSERT INTO templates VALUES (?, ?, ?, ?, ?)')
    .run(template.id, ownerId, name, JSON.stringify(template), template.createdAt!);
  return template;
}
export async function applyTemplate(
  id: string,
  ownerId: string,
  surveyId: string,
  version: number,
  mapping: Record<string, string>,
) {
  return getDb().transaction(async () => {
    const template = await getTemplate(id, ownerId);
    const survey = await getSurvey(surveyId, ownerId);
    if (survey.version !== version)
      throw new AppError('Survei sudah diperbarui. Muat ulang sebelum memakai template.', 409);
    return updateSurvey(surveyId, ownerId, {
      ...survey,
      widgets: mapPresentation(template, survey, mapping),
    });
  });
}
export async function listSubmissions(surveyId: string, dataset: Dataset = 'all'): Promise<Submission[]> {
  return (
    await getDb()
      .prepare(
        'SELECT s.*' +
          attributionColumns +
          ' FROM submissions s' +
          attributionJoin +
          'WHERE s.survey_id = ?' +
          (dataset === 'accepted' ? ' AND ' + datasetCondition() : '') +
          ' ORDER BY s.submitted_at DESC',
      )
      .all(surveyId)
  ).map((row) => parseSubmission(row as SqlRow));
}
export async function* scanSubmissions(surveyId: string, dataset: Dataset = 'all') {
  let cursor = '';
  while (true) {
    const rows = await getDb()
      .prepare(
        'SELECT s.* FROM submissions s WHERE s.survey_id = ? AND s.id > ?' +
          (dataset === 'accepted' ? ' AND ' + datasetCondition() : '') +
          ' ORDER BY s.id LIMIT 250',
      )
      .all(surveyId, cursor);
    if (!rows.length) return;
    for (const row of rows) {
      cursor = String(row.id);
      yield parseSubmission(row);
    }
  }
}
export async function submitResponse(
  token: string,
  input: unknown,
  requestKey: string,
  referralToken?: string,
  clientStartedAt?: string,
) {
  const db = getDb();
  return db.transaction(async () => {
    // Concurrent collectors share the definition lock; editing/closing still waits for them.
    // Quota enforcement retains the exclusive path for an exact capacity boundary.
    const collecting = process.env.ENFORCE_FREE_LIMITS !== 'true';
    const survey = await getSurveyByToken(token, collecting);
    if (collecting) await db.lockOwner('submission:' + survey.id + ':' + requestKey);
    const source = referralToken
      ? (await resolveReferral(referralToken, survey.id, survey)).attribution
      : undefined;
    const existing = await db
      .prepare('SELECT id FROM submissions WHERE survey_id = ? AND request_key = ?')
      .get(survey.id, requestKey);
    if (existing) {
      if (source) {
        const original = await db
          .prepare('SELECT assignment_id FROM submission_attribution WHERE submission_id = ?')
          .get(existing.id);
        if (!original || original.assignment_id !== source.assignmentId)
          throw new AppError('Pengiriman ini sudah tersimpan melalui sumber link lain.', 409);
      }
      return { id: String(existing.id), duplicate: true };
    }
    assertAcceptingResponses(survey);
    const answers = validateAnswers(survey.questions, input);
    if (process.env.ENFORCE_FREE_LIMITS === 'true') {
      await db.lockOwner(survey.ownerId);
      const { getUsage } = await import('./workspace-repository');
      const { assertCapacity } = await import('./plans');
      const usage = await getUsage(survey.ownerId);
      assertCapacity(usage.responses, usage.responseLimit, 'respons bulan ini');
    }
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO submissions(id, survey_id, answers, snapshot, submitted_at, request_key) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        id,
        survey.id,
        JSON.stringify(answers),
        JSON.stringify(survey.questions),
        new Date().toISOString(),
        requestKey,
      );
    if (source)
      await db
        .prepare('INSERT INTO submission_attribution VALUES (?, ?, ?, ?, ?)')
        .run(id, source.assignmentId, source.surveyorId, source.username, source.fullName);
    await db
      .prepare('INSERT INTO submission_regions VALUES (?, ?, ?)')
      .run(id, source?.provinceId ?? null, new Date().toISOString());
    if (clientStartedAt && Number.isFinite(Date.parse(clientStartedAt))) {
      const elapsed = Math.round((Date.now() - Date.parse(clientStartedAt)) / 1000);
      await db
        .prepare('INSERT INTO submission_timing VALUES (?, ?, ?, ?)')
        .run(
          id,
          clientStartedAt,
          new Date().toISOString(),
          elapsed >= 0 && elapsed <= 86400 ? elapsed : null,
        );
    }
    return { id, duplicate: false };
  });
}
export async function editAnswer(
  surveyId: string,
  ownerId: string,
  submissionId: string,
  questionId: string,
  value: Answer,
  revision: number,
  actorId: string = ownerId,
): Promise<Submission> {
  const db = getDb();
  return db.transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId);
    const row = await db
      .prepare(
        'SELECT s.*' +
          attributionColumns +
          ' FROM submissions s' +
          attributionJoin +
          'WHERE s.id = ? AND s.survey_id = ?',
      )
      .get(submissionId, surveyId);
    if (!row) throw new AppError('Respons tidak ditemukan.', 404);
    const submission = parseSubmission(row as SqlRow);
    if (submission.revision !== revision)
      throw new AppError('Respons telah diperbarui. Muat ulang data untuk melanjutkan.', 409);
    const q =
      submission.questionSnapshot.find((p) => p.id === questionId) ??
      survey.questions.find((p) => p.id === questionId);
    if (!q) throw new AppError('Pertanyaan tidak ditemukan.');
    const validated = validateAnswers([q], { [questionId]: value });
    const before = submission.answers[questionId] ?? null;
    if (validated[questionId] === undefined) delete submission.answers[questionId];
    else submission.answers[questionId] = validated[questionId];
    if (!submission.questionSnapshot.some((p) => p.id === q.id)) submission.questionSnapshot.push(q);
    await db
      .prepare('UPDATE submissions SET answers = ?, snapshot = ?, revision = revision + 1 WHERE id = ?')
      .run(JSON.stringify(submission.answers), JSON.stringify(submission.questionSnapshot), submissionId);
    await db
      .prepare('INSERT INTO audit VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        randomUUID(),
        surveyId,
        submissionId,
        questionId,
        JSON.stringify(before),
        JSON.stringify(value),
        actorId,
        new Date().toISOString(),
      );
    return { ...submission, revision: submission.revision + 1 };
  });
}
export async function listAudit(surveyId: string): Promise<AuditEntry[]> {
  return (
    await getDb().prepare('SELECT * FROM audit WHERE survey_id = ? ORDER BY at DESC LIMIT 100').all(surveyId)
  ).map((row) => ({
    id: String(row.id),
    submissionId: String(row.submission_id),
    questionId: String(row.question_id),
    before: JSON.parse(String(row.before_value)),
    after: JSON.parse(String(row.after_value)),
    at: String(row.at),
    actor: String(row.actor),
  }));
}
export async function listPublicSurveys() {
  return (await getDb().prepare('SELECT payload FROM surveys ORDER BY updated_at DESC').all())
    .map((row) => JSON.parse(String(row.payload)) as Survey)
    .filter((s) => !s.archivedAt && !s.deletedAt && s.visibility === 'public' && s.status !== 'draft')
    .map((s) => ({
      title: s.title,
      description: s.description,
      institution: s.institution,
      token: s.token,
      status: s.status,
      demo: s.demo,
    }));
}
export async function allowSubmission(key: string): Promise<boolean> {
  const now = Date.now();
  const db = getDb();
  await db.prepare('DELETE FROM public_rate_limits WHERE expires_at < ?').run(now);
  const row = await db
    .prepare(
      'INSERT INTO public_rate_limits(key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = public_rate_limits.count + 1 RETURNING count',
    )
    .get(key, now + 60_000);
  return Number(row?.count ?? 0) <= 20;
}

export async function manageSurvey(
  id: string,
  ownerId: string,
  action: 'duplicate' | 'archive' | 'unarchive' | 'trash' | 'restore' | 'opened',
  actor = ownerId,
): Promise<Survey> {
  return getDb().transaction(async () => {
    const source = await getSurvey(id, ownerId);
    const now = new Date().toISOString();
    if (action === 'duplicate') {
      const clone: Survey = {
        ...structuredClone(source),
        id: randomUUID(),
        token: randomUUID().replaceAll('-', ''),
        title: `${source.title.slice(0, 180)} (salinan)`,
        status: 'draft',
        visibility: 'link',
        version: 1,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        deletedAt: null,
        responseCount: 0,
        demo: false,
      };
      await insertSurvey(clone);
      return clone;
    }
    const next: Survey = { ...source, version: source.version + 1, updatedAt: now };
    if (action === 'archive') {
      next.archivedAt = now;
      next.status = 'closed';
    }
    if (action === 'unarchive') {
      next.archivedAt = null;
      next.status = 'draft';
    }
    if (action === 'trash') {
      next.deletedAt = now;
      next.status = 'closed';
      await getDb()
        .prepare(
          'UPDATE presentation_shares SET revoked_at = ?, updated_at = ? WHERE owner_id = ? AND presentation_id IN (SELECT id FROM presentations WHERE survey_id = ? AND owner_id = ?)',
        )
        .run(now, now, ownerId, id, ownerId);
    }
    if (action === 'restore') {
      next.deletedAt = null;
      next.archivedAt = null;
      next.status = 'draft';
    }
    if (action === 'opened') {
      next.lastOpenedAt = now;
      next.version = source.version;
      next.updatedAt = source.updatedAt;
    }
    await getDb()
      .prepare('UPDATE surveys SET payload = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(next), next.updatedAt, id, ownerId);
    if (action !== 'opened') await recordActivity(ownerId, actor, 'survey.' + action, id);
    return next;
  });
}

export async function ensureDemoWorkspace(ownerId: string) {
  const db = getDb();
  return db.transaction(async () => {
    await db.lockOwner(ownerId);
    if ((await listSurveys(ownerId)).length > 0) {
      return;
    }
    const main = await createSurvey(ownerId, 'SKM DAMKAR Tangerang Selatan', 'skm');
    main.institution = 'Dinas Pemadam Kebakaran';
    main.status = 'open';
    main.visibility = 'link';
    main.demo = true;
    await db.prepare('UPDATE surveys SET payload = ? WHERE id = ?').run(JSON.stringify(main), main.id);
    const names = [
      'Aditya Pratama',
      'Nadia Putri',
      'Rizky Ramadhan',
      'Dewi Lestari',
      'Fajar Maulana',
      'Siti Rahma',
      'Bima Saputra',
      'Ayu Wulandari',
    ];
    for (let i = 0; i < 48; i++) {
      const answers: Record<string, Answer> = {};
      main.questions.forEach((q, qi) => {
        if (q.id === 'name') answers[q.id] = names[i % names.length];
        else if (q.id === 'feedback')
          answers[q.id] = [
            'Pelayanan cepat dan petugas sangat membantu.',
            'Informasi prosedur bisa dibuat lebih mudah ditemukan.',
            'Semoga fasilitas dan pelayanan terus ditingkatkan.',
            'Terima kasih atas respons petugas yang sigap.',
          ][i % 4];
        else if (q.scored) answers[q.id] = q.options[(i * 7 + qi * 3) % 10 < 6 ? 3 : 2].id;
        else answers[q.id] = q.options[(i + qi) % q.options.length].id;
      });
      await db
        .prepare(
          'INSERT INTO submissions(id, survey_id, answers, snapshot, submitted_at, request_key) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          randomUUID(),
          main.id,
          JSON.stringify(answers),
          JSON.stringify(main.questions),
          new Date(Date.UTC(2026, 9, 1 + (i % 13), 7 + (i % 8), i % 60)).toISOString(),
          `demo-${i}`,
        );
    }
    const second = await createSurvey(ownerId, 'Evaluasi pengalaman layanan', 'experience');
    second.institution = 'Pelayanan Terpadu';
    second.demo = true;
    await db.prepare('UPDATE surveys SET payload = ? WHERE id = ?').run(JSON.stringify(second), second.id);
  });
}
