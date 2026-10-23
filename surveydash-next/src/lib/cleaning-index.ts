import { createHash } from 'node:crypto';
import { getDb } from './db';
import { AppError, getSurvey } from './repository';
import { answerLabel } from './model';
import {
  answerFingerprint,
  cleaningIdentity,
  cleaningStatuses,
  maskAccount,
  normalizeAccount,
  normalizeIdentity,
  type CleaningConfig,
  type CleaningPage,
  type CleaningFlagKind,
  type CleaningRow,
  type CleaningStatus,
} from './cleaning-model';
import type { Survey, Submission } from './types';
type Input = {
  page: number;
  pageSize: number;
  flaggedOnly: 'true' | 'false';
  status: 'all' | CleaningStatus;
  flag: 'all' | CleaningFlagKind;
  focus?: string;
};
type Row = Record<string, string | number | null>;
function submission(row: Row): Submission {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    revision: Number(row.revision),
    answers: JSON.parse(String(row.answers)),
    questionSnapshot: JSON.parse(String(row.snapshot)),
    submittedAt: String(row.submitted_at),
  };
}
const kinds = ['name', 'account', 'answers'] as const;
const columns = { name: 'name_key', account: 'account_key', answers: 'answer_key' } as const;
export async function indexedCleaningPage(
  survey: Survey,
  ownerId: string,
  config: CleaningConfig,
  configUpdatedAt: string | null,
  input: Input,
): Promise<CleaningPage> {
  const version = createHash('sha256')
    .update(JSON.stringify([config, survey.questions.map((q) => [q.id, q.type, q.options])]))
    .digest('hex');
  const stale =
    'SELECT s.* FROM submissions s LEFT JOIN cleaning_keys k ON k.submission_id = s.id WHERE s.survey_id = ? AND (k.submission_id IS NULL OR k.revision <> s.revision OR k.config_version <> ?)';
  await getDb().transaction(async () => {
    await getSurvey(survey.id, ownerId);
    const rows = await getDb()
      .prepare(stale + ' ORDER BY s.id LIMIT 500')
      .all(survey.id, version);
    if (!rows.length) return;
    const parameters: (string | number)[] = [];
    for (const raw of rows) {
      const row = submission(raw);
      const text = (id?: string) => {
        const question = survey.questions.find((q) => q.id === id);
        const answer = id ? row.answers[id] : undefined;
        return question && typeof answer === 'string' && answer.trim()
          ? answerLabel(question, answer).trim()
          : '';
      };
      const name = normalizeIdentity(text(config.nameQuestionId)),
        bank = normalizeIdentity(text(config.bankQuestionId)),
        account = normalizeAccount(text(config.accountQuestionId));
      const keys = [
        name,
        bank && account ? JSON.stringify([bank, account]) : '',
        answerFingerprint(survey, row, config),
      ];
      const hash = (value: string, index: number) =>
        value
          ? createHash('sha256')
              .update(survey.id + ':' + index + ':' + value)
              .digest('hex')
          : '';
      parameters.push(row.id, survey.id, row.revision, version, ...keys.map(hash));
    }
    await getDb()
      .prepare(
        'INSERT INTO cleaning_keys VALUES ' +
          rows.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',') +
          ' ON CONFLICT(submission_id) DO UPDATE SET revision = excluded.revision, config_version = excluded.config_version, name_key = excluded.name_key, account_key = excluded.account_key, answer_key = excluded.answer_key',
      )
      .run(...parameters);
  });
  const pending = Number(
    (
      await getDb()
        .prepare('SELECT count(*) AS n FROM (' + stale + ') pending')
        .get(survey.id, version)
    ).n,
  );
  const total =
    survey.responseCount ??
    Number(
      (await getDb().prepare('SELECT count(*) AS n FROM submissions WHERE survey_id = ?').get(survey.id)).n,
    );
  if (pending)
    return {
      config,
      configUpdatedAt,
      rows: [],
      total,
      flagged: 0,
      filtered: 0,
      page: 1,
      pageSize: input.pageSize,
      focus: input.focus ?? null,
      audit: [],
      indexing: { done: total - pending, total },
    };
  const cte = `WITH scoped AS (SELECT * FROM cleaning_keys WHERE survey_id = ? AND config_version = ?),
    names AS (SELECT name_key, count(*) AS n FROM scoped WHERE name_key <> '' GROUP BY name_key),
    accounts AS (SELECT account_key, count(*) AS n FROM scoped WHERE account_key <> '' GROUP BY account_key),
    answers AS (SELECT answer_key, count(*) AS n FROM scoped WHERE answer_key <> '' GROUP BY answer_key) `;
  const from = ` FROM scoped k JOIN submissions s ON s.id = k.submission_id LEFT JOIN cleaning_reviews r ON r.submission_id = s.id
    LEFT JOIN names nk ON nk.name_key = k.name_key LEFT JOIN accounts ak ON ak.account_key = k.account_key LEFT JOIN answers bk ON bk.answer_key = k.answer_key `;
  const flagged = '(COALESCE(nk.n,0)>1 OR COALESCE(ak.n,0)>1 OR COALESCE(bk.n,0)>1)';
  const values: (string | number)[] = [survey.id, version];
  let where = '1 = 1';
  if (input.focus) {
    const source = await getDb()
      .prepare('SELECT * FROM cleaning_keys WHERE submission_id = ? AND survey_id = ? AND config_version = ?')
      .get(input.focus, survey.id, version);
    if (!source) throw new AppError('Respons tidak ditemukan.', 404);
    where = '(s.id = ?';
    values.push(input.focus);
    for (const kind of kinds) {
      const column = columns[kind];
      if (source[column]) {
        where += ` OR k.${column} = ?`;
        values.push(String(source[column]));
      }
    }
    where += ')';
  } else {
    if (input.flaggedOnly === 'true') where += ' AND ' + flagged;
    if (input.flag !== 'all')
      where +=
        ' AND ' +
        { name: 'COALESCE(nk.n,0)>1', account: 'COALESCE(ak.n,0)>1', answers: 'COALESCE(bk.n,0)>1' }[
          input.flag
        ];
    if (input.status !== 'all') {
      where += " AND CASE WHEN r.revision = s.revision THEN r.status ELSE 'unreviewed' END = ?";
      values.push(input.status);
    }
  }
  const filtered = Number(
    (
      await getDb()
        .prepare(cte + 'SELECT count(*) AS n' + from + ' WHERE ' + where)
        .get(...values)
    ).n,
  );
  const flaggedCount = Number(
    (
      await getDb()
        .prepare(cte + 'SELECT count(*) AS n' + from + ' WHERE ' + flagged)
        .get(survey.id, version)
    ).n,
  );
  const page = Math.min(input.page, Math.max(1, Math.ceil(filtered / input.pageSize)));
  const rawRows = await getDb()
    .prepare(
      cte +
        `SELECT s.*, k.name_key, k.account_key, k.answer_key, nk.n AS name_count, ak.n AS account_count, bk.n AS answer_count,
    r.status AS review_status, r.reason AS review_reason, r.revision AS review_revision, r.actor AS review_actor, r.reviewed_at,
    t.reported_seconds` +
        from +
        ' LEFT JOIN submission_timing t ON t.submission_id = s.id WHERE ' +
        where +
        ' ORDER BY ' +
        (input.focus ? 'CASE WHEN s.id = ? THEN 0 ELSE 1 END, ' : '') +
        's.submitted_at DESC, s.id ASC LIMIT ? OFFSET ?',
    )
    .all(...values, ...(input.focus ? [input.focus] : []), input.pageSize, (page - 1) * input.pageSize);
  const samples = new Map<string, string[]>();
  const rows: CleaningRow[] = [];
  for (const raw of rawRows) {
    const row = submission(raw),
      flags: CleaningRow['flags'] = [];
    for (const kind of kinds) {
      const count = Number(
        raw[{ name: 'name_count', account: 'account_count', answers: 'answer_count' }[kind]] ?? 0,
      );
      if (count < 2) continue;
      const key = String(raw[columns[kind]]),
        cacheKey = kind + ':' + key;
      if (!samples.has(cacheKey))
        samples.set(
          cacheKey,
          (
            await getDb()
              .prepare(
                `SELECT submission_id FROM cleaning_keys WHERE survey_id = ? AND config_version = ? AND ${columns[kind]} = ? ORDER BY submission_id LIMIT 11`,
              )
              .all(survey.id, version, key)
          ).map((item) => String(item.submission_id)),
        );
      flags.push({
        kind,
        count,
        sampleIds: samples
          .get(cacheKey)!
          .filter((id) => id !== row.id)
          .slice(0, 10),
      });
    }
    rows.push({
      id: row.id,
      submittedAt: row.submittedAt,
      revision: row.revision,
      ...cleaningIdentity(survey, row, config),
      flags,
      reportedSeconds:
        raw.reported_seconds === null || raw.reported_seconds === undefined
          ? null
          : Number(raw.reported_seconds),
      review: raw.review_status
        ? {
            status: raw.review_status as CleaningStatus,
            reason: String(raw.review_reason),
            revision: Number(raw.review_revision),
            actor: String(raw.review_actor),
            reviewedAt: String(raw.reviewed_at),
            stale: Number(raw.review_revision) !== row.revision,
          }
        : null,
      ...(input.focus
        ? {
            comparison: survey.questions.map((question) => {
              const value =
                question.id === config.accountQuestionId
                  ? maskAccount(String(row.answers[question.id] ?? ''))
                  : answerLabel(question, row.answers[question.id]);
              return {
                questionId: question.id,
                label: question.label,
                value: value.slice(0, 1000),
                truncated: value.length > 1000,
              };
            }),
          }
        : {}),
    });
  }
  const history = await getDb()
    .prepare('SELECT * FROM cleaning_review_audit WHERE survey_id = ? ORDER BY at DESC, id LIMIT 100')
    .all(survey.id);
  return {
    config,
    configUpdatedAt,
    rows,
    total,
    flagged: flaggedCount,
    filtered,
    page,
    pageSize: input.pageSize,
    focus: input.focus ?? null,
    audit: history.map((row) => ({
      id: String(row.id),
      submissionId: String(row.submission_id),
      status: cleaningStatuses.includes(row.status as CleaningStatus)
        ? (row.status as CleaningStatus)
        : 'unreviewed',
      reason: String(row.reason),
      revision: Number(row.revision),
      actor: String(row.actor),
      at: String(row.at),
    })),
  };
}
