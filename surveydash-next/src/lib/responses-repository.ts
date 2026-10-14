import { z } from 'zod';
import { getDb } from './db';
import { AppError, getSurvey, listAudit, listSubmissions } from './repository';
import { answerLabel, calculateStats, csvCell, distribution } from './model';
import type { Question, ResponsePage, Submission, Survey, SurveyInsights } from './types';

export const responseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().trim().max(200).default(''),
  sort: z.string().max(110).default('submittedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});
type Query = z.infer<typeof responseQuerySchema>;
type SqlPart = { sql: string; values: (string | number)[] };
const from = ' FROM submissions s JOIN surveys v ON v.id = s.survey_id ';

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
  if (query.search) {
    const parts: SqlPart[] = [
      { sql: 's.id', values: [] },
      { sql: 's.submitted_at', values: [] },
      ...survey.questions.map(labelExpression),
    ];
    const text = parts.map((part) => 'COALESCE(' + part.sql + ", '')").join(" || ' ' || ");
    const find = getDb().dialect === 'postgres' ? 'strpos' : 'instr';
    where.sql += ' AND ' + find + '(lower(' + text + '), lower(?)) > 0';
    where.values.push(...parts.flatMap((part) => part.values), query.search);
  }
  let sort: SqlPart = { sql: 's.submitted_at', values: [] };
  if (query.sort !== 'submittedAt') {
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
  };
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
    .prepare('SELECT s.*' + from + 'WHERE ' + where.sql + ' ORDER BY ' + order + ' LIMIT ? OFFSET ?')
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
): Promise<SurveyInsights> {
  const survey = await getSurvey(id, ownerId);
  const rows = await listSubmissions(id);
  return {
    stats: calculateStats(survey, rows),
    questions: Object.fromEntries(
      survey.questions.map((q) => [
        q.id,
        {
          answered: rows.filter((row) => {
            const value = row.answers[q.id];
            return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);
          }).length,
          distribution: q.options.length ? distribution(q, rows) : [],
          samples:
            !includeSamples || q.options.length
              ? []
              : rows
                  .filter((row) => row.answers[q.id] !== undefined && row.answers[q.id] !== '')
                  .slice(0, 50)
                  .map((row) => {
                    const label = answerLabel(q, row.answers[q.id]);
                    return label.length > 500 ? label.slice(0, 500) + '…' : label;
                  }),
        },
      ]),
    ),
  };
}
export async function exportResponseCsv(id: string, ownerId: string, input: unknown, signal: AbortSignal) {
  const query = responseQuerySchema.parse(input);
  const survey = await getSurvey(id, ownerId);
  const { where, order, sortValues } = buildQuery(survey, ownerId, query);
  const encoder = new TextEncoder();
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          '\uFEFF' +
            ['ID respons', 'Waktu', ...survey.questions.map((q) => q.label)].map(csvCell).join(',') +
            '\r\n',
        ),
      );
    },
    async pull(controller) {
      if (signal.aborted) {
        controller.close();
        return;
      }
      const result = await getDb()
        .prepare('SELECT s.*' + from + 'WHERE ' + where.sql + ' ORDER BY ' + order + ' LIMIT 100 OFFSET ?')
        .all(...where.values, ...sortValues, offset);
      if (!result.length) {
        controller.close();
        return;
      }
      const lines =
        result
          .map(parseRow)
          .map((row) =>
            [row.id, row.submittedAt, ...survey.questions.map((q) => answerLabel(q, row.answers[q.id]))]
              .map(csvCell)
              .join(','),
          )
          .join('\r\n') + '\r\n';
      controller.enqueue(encoder.encode(lines));
      offset += result.length;
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
