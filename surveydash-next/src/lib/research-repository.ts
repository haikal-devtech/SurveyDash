import { getDb } from './db';
import { AppError, getSurvey } from './repository';
import { responseExportRows, responseQuerySchema } from './responses-repository';
import { recordActivity } from './workspace-activity';
import type { CrossTab } from './research-model';
export async function crossTab(
  surveyId: string,
  ownerId: string,
  rowId: string,
  columnId: string,
  weighted: boolean,
  filters: unknown,
  signal: AbortSignal,
): Promise<CrossTab> {
  const survey = await getSurvey(surveyId, ownerId);
  const rowQuestion = survey.questions.find((q) => q.id === rowId),
    columnQuestion = survey.questions.find((q) => q.id === columnId);
  if (
    rowId === columnId ||
    !rowQuestion ||
    !columnQuestion ||
    ![rowQuestion, columnQuestion].every((q) => ['choice', 'rating'].includes(q.type))
  )
    throw new AppError('Pilih dua pertanyaan pilihan tunggal atau skala yang berbeda.');
  const input = responseQuerySchema.parse(filters);
  const cells = rowQuestion.options.map(() =>
    columnQuestion.options.map(() => ({ count: 0, weighted: 0, percent: 0 })),
  );
  let total = 0,
    paired = 0,
    weightedTotal = 0;
  for await (const response of responseExportRows(surveyId, ownerId, input, signal)) {
    total++;
    const row = rowQuestion.options.findIndex((option) => option.id === response.answers[rowId]);
    const column = columnQuestion.options.findIndex((option) => option.id === response.answers[columnId]);
    if (row < 0 || column < 0) continue;
    const weight = weighted ? response.analysisWeight : 1;
    paired++;
    weightedTotal += weight;
    cells[row][column].count++;
    cells[row][column].weighted += weight;
  }
  for (const row of cells)
    for (const cell of row) cell.percent = weightedTotal ? (cell.weighted / weightedTotal) * 100 : 0;
  return {
    rows: rowQuestion.options.map((option) => option.label),
    columns: columnQuestion.options.map((option) => option.label),
    cells,
    total,
    paired,
    weightedTotal,
    weighted,
    dataset: input.dataset ?? survey.dataset ?? 'all',
  };
}
export async function setResponseWeight(
  surveyId: string,
  ownerId: string,
  actor: string,
  input: { submissionId: string; revision: number; weight: number; reason: string },
) {
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    const row = await getDb()
      .prepare('SELECT revision FROM submissions WHERE id = ? AND survey_id = ?' + getDb().lockSuffix)
      .get(input.submissionId, surveyId);
    if (!row) throw new AppError('Respons tidak ditemukan.', 404);
    if (Number(row.revision) !== input.revision)
      throw new AppError('Jawaban berubah. Muat ulang sebelum mengatur bobot.', 409);
    if (
      !Number.isFinite(input.weight) ||
      input.weight <= 0 ||
      input.weight > 1000 ||
      input.reason.trim().length < 5
    )
      throw new AppError('Bobot harus lebih dari 0 sampai 1000, disertai alasan.');
    await getDb()
      .prepare(
        `INSERT INTO submission_weights VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO UPDATE SET weight = excluded.weight, revision = excluded.revision, reason = excluded.reason, actor = excluded.actor, updated_at = excluded.updated_at`,
      )
      .run(
        input.submissionId,
        input.weight,
        input.revision,
        input.reason.trim(),
        actor,
        new Date().toISOString(),
      );
    await recordActivity(ownerId, actor, 'response.weight', input.submissionId, {
      weight: input.weight,
      revision: input.revision,
      reason: input.reason.trim(),
    });
    return { weight: input.weight };
  });
}
