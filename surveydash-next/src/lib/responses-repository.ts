import { z } from 'zod';
import { getDb } from './db';
import { AppError, getSurvey, listAudit, scanSubmissions } from './repository';
import { answerLabel, csvCell } from './model';
import type { Question, ResponsePage, Submission, Survey, SurveyInsights } from './types';
import { attributionColumns, attributionJoin, parseAttribution } from './surveyor-repository';
import { InsightAccumulator, streamingBreakdown } from './streaming-insights';
import { datasetCondition, responseQuality } from './response-quality';

export const responseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().trim().max(200).default(''),
  sort: z.string().max(110).default('submittedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  dataset: z.enum(['all', 'accepted']).optional(),
  province: z.string().max(70).optional(),
  surveyor: z.string().max(100).optional(),
  after: z.iso.datetime({ offset: true }).optional(),
  before: z.iso.datetime({ offset: true }).optional(),
});
type Query = z.infer<typeof responseQuerySchema>;
type SqlPart = { sql: string; values: (string | number)[] };
const weightColumns = ', COALESCE(w.weight, 1) AS analysis_weight';
const from =
  ' FROM submissions s JOIN surveys v ON v.id = s.survey_id ' +
  attributionJoin +
  ' LEFT JOIN submission_weights w ON w.submission_id = s.id AND w.revision = s.revision ';

function answerExpression(q: Question): SqlPart {
  if (getDb().dialect === 'postgres') return { sql: '(s.answers::jsonb ->> ?)', values: [q.id] };
  return { sql: '(SELECT value FROM json_each(s.answers) WHERE key = ?)', values: [q.id] };
}
function labelExpression(q: Question): SqlPart {
  const raw = answerExpression(q);
  let result: SqlPart = { sql: 'CAST(' + raw.sql + ' AS TEXT)', values: raw.values };
  if (q.type === 'checkbox') {
    for (const option of q.options)
      result = {
        sql: 'replace(' + result.sql + ', ?, ?)',
        values: [...result.values, JSON.stringify(option.id), option.label],
      };
    return result;
  }
  if (!q.options.length) return result;
  return {
    sql:
      'CASE ' + result.sql + q.options.map(() => ' WHEN ? THEN ?').join('') + ' ELSE ' + result.sql + ' END',
    values: [...result.values, ...q.options.flatMap((option) => [option.id, option.label]), ...result.values],
  };
}
function buildQuery(survey: Survey, ownerId: string, query: Query) {
  const where: SqlPart = {
    sql: 's.survey_id = ? AND v.owner_id = ?',
    values: [survey.id, ownerId],
  };
  if ((query.dataset ?? survey.dataset) === 'accepted') where.sql += ' AND ' + datasetCondition();
  if (query.province) {
    where.sql +=
      ' AND EXISTS (SELECT 1 FROM submission_regions sr WHERE sr.submission_id = s.id AND sr.province_id = ?)';
    where.values.push(query.province);
  }
  if (query.surveyor) {
    where.sql += ' AND (x.surveyor_id = ? OR lower(x.username_snapshot) = lower(?))';
    where.values.push(query.surveyor, query.surveyor.replace(/^@/, ''));
  }
  if (query.after) {
    where.sql += ' AND s.submitted_at >= ?';
    where.values.push(query.after);
  }
  if (query.before) {
    where.sql += ' AND s.submitted_at <= ?';
    where.values.push(query.before);
  }
  if (query.search) {
    const parts: SqlPart[] = [
      { sql: 's.id', values: [] },
      { sql: 's.submitted_at', values: [] },
      { sql: 'x.name_snapshot', values: [] },
      { sql: 'x.username_snapshot', values: [] },
      ...survey.questions.map(labelExpression),
    ];
    const text = parts.map((part) => 'COALESCE(' + part.sql + ", '')").join(" || ' ' || ");
    const find = getDb().dialect === 'postgres' ? 'strpos' : 'instr';
    where.sql += ' AND ' + find + '(lower(' + text + '), lower(?)) > 0';
    where.values.push(...parts.flatMap((part) => part.values), query.search);
  }
  let sort: SqlPart = { sql: 's.submitted_at', values: [] };
  if (query.sort === 'surveyor') {
    sort = { sql: "COALESCE(x.name_snapshot, '')", values: [] };
  } else if (query.sort !== 'submittedAt') {
    const question = survey.questions.find((q) => 'question:' + q.id === query.sort);
    if (!question) throw new AppError('Kolom urutan tidak ditemukan.');
    sort =
      question.type === 'number'
        ? (() => {
            const raw = answerExpression(question);
            return { sql: 'CAST(NULLIF(' + raw.sql + ", '') AS NUMERIC)", values: raw.values };
          })()
        : labelExpression(question);
  }
  const emptyLast =
    query.sort === 'submittedAt'
      ? ''
      : 'CASE WHEN COALESCE(CAST(' + sort.sql + " AS TEXT), '') = '' THEN 1 ELSE 0 END ASC, ";
  const order = emptyLast + sort.sql + (query.direction === 'asc' ? ' ASC' : ' DESC') + ', s.id ASC';
  return {
    where,
    order,
    sortValues: query.sort === 'submittedAt' ? sort.values : [...sort.values, ...sort.values],
  };
}
function parseRow(row: Record<string, string | number | null>): Submission {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    submittedAt: String(row.submitted_at),
    answers: JSON.parse(String(row.answers)),
    questionSnapshot: JSON.parse(String(row.snapshot)),
    revision: Number(row.revision),
    surveyor: parseAttribution(row),
    analysisWeight: Number(row.analysis_weight ?? 1),
  };
}
const exportSourceColumns =
  ', i.provider AS import_provider, i.response_id AS import_response_id, i.raw_answers AS import_raw';
const exportFrom = from + ' LEFT JOIN submission_import_sources i ON i.submission_id = s.id ';
export async function countResponseExport(id: string, ownerId: string, input: unknown) {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const { where } = buildQuery(survey, ownerId, query);
  const count = await getDb()
    .prepare('SELECT count(*) AS total' + from + 'WHERE ' + where.sql)
    .get(...where.values);
  return Number(count.total);
}
export async function* responseExportRows(id: string, ownerId: string, input: unknown, signal: AbortSignal) {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const { where, order, sortValues } = buildQuery(survey, ownerId, query);
  let offset = 0;
  while (true) {
    signal.throwIfAborted();
    const rows = await getDb()
      .prepare(
        'SELECT s.*' +
          weightColumns +
          attributionColumns +
          exportSourceColumns +
          exportFrom +
          'WHERE ' +
          where.sql +
          ' ORDER BY ' +
          order +
          ' LIMIT 100 OFFSET ?',
      )
      .all(...where.values, ...sortValues, offset);
    if (!rows.length) return;
    for (const raw of rows)
      yield {
        ...parseRow(raw),
        analysisWeight: Number(raw.analysis_weight ?? 1),
        importProvider: String(raw.import_provider ?? ''),
        importResponseId: String(raw.import_response_id ?? ''),
        importRaw: String(raw.import_raw ?? ''),
      };
    offset += rows.length;
  }
}
export async function getResponsePage(id: string, ownerId: string, input: unknown): Promise<ResponsePage> {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const { where, order, sortValues } = buildQuery(survey, ownerId, query);
  const count = await getDb()
    .prepare('SELECT count(*) AS total' + from + 'WHERE ' + where.sql)
    .get(...where.values);
  const filtered = Number(count.total);
  const page = Math.min(query.page, Math.max(1, Math.ceil(filtered / query.pageSize)));
  const result = await getDb()
    .prepare(
      'SELECT s.*' +
        weightColumns +
        attributionColumns +
        from +
        'WHERE ' +
        where.sql +
        ' ORDER BY ' +
        order +
        ' LIMIT ? OFFSET ?',
    )
    .all(...where.values, ...sortValues, query.pageSize, (page - 1) * query.pageSize);
  return {
    rows: result.map(parseRow),
    total: survey.responseCount ?? 0,
    filtered,
    page,
    pageSize: query.pageSize,
    audit: await listAudit(id),
  };
}
export async function getSurveyInsights(
  id: string,
  ownerId: string,
  includeSamples = false,
  dataset?: 'all' | 'accepted',
): Promise<SurveyInsights> {
  const survey = await getSurvey(id, ownerId);
  const selectedDataset = dataset ?? survey.dataset ?? 'all';
  const accumulator = new InsightAccumulator(survey, includeSamples);
  for await (const row of scanSubmissions(id, selectedDataset)) accumulator.add(row);
  return {
    ...accumulator.finish(),
    quality: await responseQuality(id),
    dataset: selectedDataset,
  };
}
export async function getQuestionBreakdown(id: string, ownerId: string, questionId: string) {
  const survey = await getSurvey(id, ownerId);
  const question = survey.questions.find((q) => q.id === questionId);
  if (!question) throw new AppError('Pertanyaan tidak ditemukan.', 404);
  return streamingBreakdown(question, () => scanSubmissions(id, survey.dataset));
}
export async function exportResponseCsv(id: string, ownerId: string, input: unknown, signal: AbortSignal) {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const rows = responseExportRows(id, ownerId, query, signal);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          '\uFEFF' +
            [
              'ID respons',
              'Waktu',
              'Surveyor',
              'Username surveyor',
              'ID penugasan',
              ...survey.questions.map((q) => q.label),
              'Sumber impor',
              'ID respons sumber',
              'Data asli impor (JSON)',
              'Bobot manual (revisi terbaru)',
            ]
              .map(csvCell)
              .join(',') +
            '\r\n',
        ),
      );
    },
    async pull(controller) {
      if (signal.aborted) {
        controller.close();
        return;
      }
      const result = [];
      for (let i = 0; i < 100; i++) {
        const next = await rows.next();
        if (next.done) break;
        result.push(next.value);
      }
      if (!result.length) {
        controller.close();
        return;
      }
      const lines =
        result
          .map((row) =>
            [
              row.id,
              row.submittedAt,
              row.surveyor?.fullName ?? '',
              row.surveyor?.username ?? '',
              row.surveyor?.assignmentId ?? '',
              ...survey.questions.map((q) => answerLabel(q, row.answers[q.id])),
              row.importProvider,
              row.importResponseId,
              row.importRaw,
              String(row.analysisWeight),
            ]
              .map(csvCell)
              .join(','),
          )
          .join('\r\n') + '\r\n';
      controller.enqueue(encoder.encode(lines));
    },
    async cancel() {
      await rows.return();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="' + (survey.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'survei') + '.csv"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
