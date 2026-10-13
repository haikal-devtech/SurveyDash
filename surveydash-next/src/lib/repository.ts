import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { Answer, AuditEntry, Question, Submission, Survey } from './types';
import {
  assertAcceptingResponses,
  assertSchemaCompatible,
  surveyInputSchema,
  validateAnswers,
} from './model';
import { defaultWidgets, templateDefinitions } from './templates';

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
});

export async function listSurveys(ownerId: string): Promise<Survey[]> {
  return (
    await getDb()
      .prepare(
        'SELECT surveys.*, (SELECT count(*) FROM submissions WHERE survey_id = surveys.id) AS response_count FROM surveys WHERE owner_id = ? ORDER BY updated_at DESC',
      )
      .all(ownerId)
  ).map((row) => parseSurvey(row as SqlRow));
}
export async function getSurvey(id: string, ownerId: string): Promise<Survey> {
  const row = await getDb()
    .prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?' + getDb().lockSuffix)
    .get(id, ownerId);
  if (!row) throw new AppError('Survei tidak ditemukan.', 404);
  return parseSurvey(row as SqlRow);
}
export async function getSurveyByToken(token: string): Promise<Survey> {
  const row = await getDb()
    .prepare('SELECT * FROM surveys WHERE token = ?' + getDb().lockSuffix)
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
export async function listTemplates(ownerId: string) {
  return (
    await getDb()
      .prepare('SELECT id, name, payload FROM templates WHERE owner_id = ? ORDER BY created_at DESC')
      .all(ownerId)
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    ...(JSON.parse(String(row.payload)) as { questions: Question[]; kind: Survey['kind'] }),
  }));
}
export async function createSurvey(ownerId: string, title: string, templateId: string): Promise<Survey> {
  const template =
    templateDefinitions.find((t) => t.id === templateId) ??
    (await listTemplates(ownerId)).find((t) => t.id === templateId);
  if (!template) throw new AppError('Template tidak ditemukan.');
  const now = new Date().toISOString();
  const survey: Survey = {
    id: randomUUID(),
    ownerId,
    title: title.trim(),
    description:
      'Terima kasih telah meluangkan waktu untuk memberikan masukan. Jawaban Anda membantu kami meningkatkan kualitas layanan.',
    institution: '',
    status: 'draft',
    visibility: 'link',
    kind: template.kind,
    token: randomUUID().replaceAll('-', ''),
    questions: structuredClone(template.questions),
    widgets: templateId === 'blank' ? [] : defaultWidgets(template.kind),
    version: 1,
    target: 400,
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
export async function updateSurvey(id: string, ownerId: string, input: unknown): Promise<Survey> {
  const parsed = surveyInputSchema.parse(input);
  const db = getDb();
  return db.transaction(async () => {
    const before = await getSurvey(id, ownerId);
    if (before.version !== parsed.version)
      throw new AppError('Survei sudah diperbarui di tab lain. Muat ulang sebelum menyimpan.', 409);
    assertSchemaCompatible(before, parsed, (await listSubmissions(id)).length > 0);
    const after: Survey = {
      ...before,
      ...parsed,
      version: before.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db
      .prepare('UPDATE surveys SET payload = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(after), after.updatedAt, id, ownerId);
    return after;
  });
}
export async function saveTemplate(survey: Survey, name: string) {
  const id = randomUUID();
  await getDb()
    .prepare('INSERT INTO templates VALUES (?, ?, ?, ?, ?)')
    .run(
      id,
      survey.ownerId,
      name,
      JSON.stringify({ questions: survey.questions, kind: survey.kind }),
      new Date().toISOString(),
    );
  return { id, name };
}
export async function listSubmissions(surveyId: string): Promise<Submission[]> {
  return (
    await getDb()
      .prepare('SELECT * FROM submissions WHERE survey_id = ? ORDER BY submitted_at DESC')
      .all(surveyId)
  ).map((row) => parseSubmission(row as SqlRow));
}
export async function submitResponse(token: string, input: unknown, requestKey: string) {
  const db = getDb();
  return db.transaction(async () => {
    const survey = await getSurveyByToken(token);
    const existing = await db
      .prepare('SELECT id FROM submissions WHERE survey_id = ? AND request_key = ?')
      .get(survey.id, requestKey);
    if (existing) {
      return { id: String(existing.id), duplicate: true };
    }
    assertAcceptingResponses(survey);
    const answers = validateAnswers(survey.questions, input);
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
): Promise<Submission> {
  const db = getDb();
  return db.transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId);
    const row = await db
      .prepare('SELECT * FROM submissions WHERE id = ? AND survey_id = ?')
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
        ownerId,
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
    .filter((s) => s.visibility === 'public' && s.status !== 'draft')
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
