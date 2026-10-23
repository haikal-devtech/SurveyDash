import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { AppError, getSurvey } from './repository';
import { datasetCondition } from './response-quality';
import { recordActivity } from './workspace-activity';
import { answerLabel, csvCell } from './model';
import type { DatasetVersion } from './dataset-model';
import type { Survey, Submission } from './types';
import { InsightAccumulator } from './streaming-insights';
export async function listDatasetVersions(surveyId: string, ownerId: string): Promise<DatasetVersion[]> {
  await getSurvey(surveyId, ownerId);
  return (
    await getDb()
      .prepare(
        'SELECT id, name, dataset, row_count, method_notes, created_at FROM dataset_versions WHERE survey_id = ? AND owner_id = ? ORDER BY created_at DESC',
      )
      .all(surveyId, ownerId)
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    dataset: row.dataset as DatasetVersion['dataset'],
    count: Number(row.row_count),
    methodNotes: String(row.method_notes),
    createdAt: String(row.created_at),
  }));
}
export async function freezeDataset(
  surveyId: string,
  ownerId: string,
  actor: string,
  input: { name: string; dataset: 'all' | 'accepted'; methodNotes: string; acknowledged: boolean },
) {
  return getDb().transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId);
    if (survey.status !== 'closed' || survey.archivedAt || survey.deletedAt)
      throw new AppError('Tutup pengumpulan survei sebelum mengunci hasil.');
    if (!input.acknowledged || input.name.trim().length < 3 || input.methodNotes.trim().length < 10)
      throw new AppError('Lengkapi nama, catatan metode, dan persetujuan peninjauan.');
    const id = randomUUID(),
      at = new Date().toISOString();
    const { title, institution, questions, kind, target, version, demo } = survey;
    await getDb()
      .prepare('INSERT INTO dataset_versions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        id,
        surveyId,
        ownerId,
        input.name.trim(),
        input.dataset,
        JSON.stringify({ title, institution, questions, kind, target, version, demo }),
        0,
        input.methodNotes.trim(),
        actor,
        at,
      );
    await getDb()
      .prepare(
        `INSERT INTO dataset_version_rows (version_id, submission_id, revision, answers, snapshot, submitted_at, assignment_id, surveyor_username, surveyor_name, province_id, weight)
      SELECT ?, s.id, s.revision, s.answers, s.snapshot, s.submitted_at, x.assignment_id, x.username_snapshot, x.name_snapshot, r.province_id, COALESCE(w.weight,1)
      FROM submissions s LEFT JOIN submission_attribution x ON x.submission_id = s.id LEFT JOIN submission_regions r ON r.submission_id = s.id
      LEFT JOIN submission_weights w ON w.submission_id = s.id AND w.revision = s.revision WHERE s.survey_id = ?` +
          (input.dataset === 'accepted' ? ' AND ' + datasetCondition() : ''),
      )
      .run(id, surveyId);
    const count = Number(
      (await getDb().prepare('SELECT count(*) AS n FROM dataset_version_rows WHERE version_id = ?').get(id))
        .n,
    );
    await getDb().prepare('UPDATE dataset_versions SET row_count = ? WHERE id = ?').run(count, id);
    await recordActivity(ownerId, actor, 'dataset.frozen', id, { surveyId, dataset: input.dataset, count });
    return { id, count };
  });
}
export async function getDatasetVersion(surveyId: string, ownerId: string, id: string) {
  await getSurvey(surveyId, ownerId);
  const row = await getDb()
    .prepare('SELECT * FROM dataset_versions WHERE id = ? AND survey_id = ? AND owner_id = ?')
    .get(id, surveyId, ownerId);
  if (!row) throw new AppError('Versi dataset tidak ditemukan.', 404);
  return {
    id,
    name: String(row.name),
    dataset: row.dataset as 'all' | 'accepted',
    survey: JSON.parse(String(row.payload)) as Survey,
    count: Number(row.row_count),
    methodNotes: String(row.method_notes),
    createdAt: String(row.created_at),
  };
}
export async function* frozenRows(versionId: string) {
  let cursor = '';
  while (true) {
    const rows = await getDb()
      .prepare(
        'SELECT * FROM dataset_version_rows WHERE version_id = ? AND submission_id > ? ORDER BY submission_id LIMIT 250',
      )
      .all(versionId, cursor);
    if (!rows.length) return;
    for (const row of rows) {
      cursor = String(row.submission_id);
      yield {
        id: cursor,
        revision: Number(row.revision),
        answers: JSON.parse(String(row.answers)),
        questionSnapshot: JSON.parse(String(row.snapshot)),
        submittedAt: String(row.submitted_at),
        surveyId: '',
        analysisWeight: Number(row.weight),
        provinceId: row.province_id ? String(row.province_id) : null,
        surveyor: row.assignment_id
          ? {
              assignmentId: String(row.assignment_id),
              surveyorId: '',
              username: String(row.surveyor_username),
              fullName: String(row.surveyor_name),
            }
          : undefined,
      } satisfies Submission;
    }
  }
}
export async function frozenDatasetSummary(
  surveyId: string,
  ownerId: string,
  versionId: string,
  signal: AbortSignal,
) {
  const version = await getDatasetVersion(surveyId, ownerId, versionId);
  const accumulator = new InsightAccumulator(version.survey);
  let weightedTotal = 0;
  for await (const row of frozenRows(versionId)) {
    if (signal.aborted) throw new AppError('Permintaan dibatalkan.', 499);
    accumulator.add(row);
    weightedTotal += row.analysisWeight ?? 1;
  }
  const insights = accumulator.finish();
  return {
    version,
    total: insights.stats.total,
    weightedTotal,
    ikm: insights.stats.ikm,
    questions: version.survey.questions
      .filter((q) => q.options.length)
      .map((q) => ({
        id: q.id,
        label: q.label,
        answered: insights.questions[q.id].answered,
        distribution: insights.questions[q.id].distribution,
      })),
  };
}
export async function exportFrozenCsv(
  surveyId: string,
  ownerId: string,
  versionId: string,
  signal: AbortSignal,
) {
  const version = await getDatasetVersion(surveyId, ownerId, versionId);
  const source = frozenRows(versionId),
    encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          '\uFEFF' +
            [
              'ID respons',
              'Waktu (UTC)',
              'Username surveyor',
              'Provinsi tugas saat kirim',
              'Bobot',
              ...version.survey.questions.map((q) => q.label),
            ]
              .map(csvCell)
              .join(',') +
            '\r\n',
        ),
      );
    },
    async pull(controller) {
      try {
        signal.throwIfAborted();
        const lines: string[] = [];
        for (let index = 0; index < 100; index++) {
          const next = await source.next();
          if (next.done) break;
          const row = next.value;
          lines.push(
            [
              row.id,
              row.submittedAt,
              row.surveyor?.username ?? '',
              row.provinceId ?? '',
              String(row.analysisWeight),
              ...version.survey.questions.map((q) => answerLabel(q, row.answers[q.id])),
            ]
              .map(csvCell)
              .join(','),
          );
        }
        if (lines.length) controller.enqueue(encoder.encode(lines.join('\r\n') + '\r\n'));
        else controller.close();
      } catch (failure) {
        controller.error(failure);
      }
    },
    async cancel() {
      await source.return();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': 'attachment; filename="dataset-final.csv"',
      'Cache-Control': 'no-store',
      'X-Dataset-Version': versionId,
    },
  });
}
