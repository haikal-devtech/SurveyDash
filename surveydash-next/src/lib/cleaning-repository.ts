import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db';
import { AppError, getSurvey, listSubmissions } from './repository';
import { answerLabel } from './model';
import {
  cleaningConfigSchema,
  cleaningIdentity,
  cleaningStatuses,
  detectCleaningFlags,
  maskAccount,
  validateCleaningConfig,
  type CleaningAuditEntry,
  type CleaningPage,
  type CleaningReview,
  type CleaningRow,
} from './cleaning-model';

export const cleaningQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  flaggedOnly: z.enum(['true', 'false']).default('true'),
  status: z.enum(['all', ...cleaningStatuses]).default('all'),
  flag: z.enum(['all', 'name', 'account', 'answers']).default('all'),
  focus: z.string().min(1).max(100).optional(),
});
const timestamp = z.iso.datetime({ offset: true }).nullable();
export const cleaningConfigInputSchema = z.object({
  action: z.literal('config'),
  config: cleaningConfigSchema,
  expectedUpdatedAt: timestamp,
});
export const cleaningReviewInputSchema = z.object({
  action: z.literal('review'),
  submissionId: z.string().min(1).max(100),
  status: z.enum(cleaningStatuses),
  reason: z.string().trim().min(3).max(1000),
  revision: z.number().int().min(1),
  expectedReviewedAt: timestamp,
});
type SqlRow = Record<string, string | number | null>;
async function readSettings(surveyId: string) {
  const row = await getDb()
    .prepare('SELECT payload, updated_at FROM cleaning_settings WHERE survey_id = ?')
    .get(surveyId);
  return {
    config: row ? cleaningConfigSchema.parse(JSON.parse(String(row.payload))) : {},
    configUpdatedAt: row ? String(row.updated_at) : null,
  };
}
function nextTimestamp(previous: string | null) {
  return new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
}
function parseReview(row: SqlRow, currentRevision: number): CleaningReview {
  return {
    status: z.enum(cleaningStatuses).parse(row.status),
    reason: String(row.reason),
    revision: Number(row.revision),
    actor: String(row.actor),
    reviewedAt: String(row.reviewed_at),
    stale: Number(row.revision) !== currentRevision,
  };
}
export async function saveCleaningConfig(surveyId: string, ownerId: string, rawInput: unknown) {
  const input = cleaningConfigInputSchema.parse(rawInput);
  return getDb().transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId);
    const config = validateCleaningConfig(survey, input.config);
    const current = await readSettings(surveyId);
    if (current.configUpdatedAt !== input.expectedUpdatedAt)
      throw new AppError('Pengaturan cleaning telah berubah. Muat ulang sebelum menyimpan.', 409);
    const updatedAt = nextTimestamp(current.configUpdatedAt);
    await getDb()
      .prepare(
        'INSERT INTO cleaning_settings(survey_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(survey_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at',
      )
      .run(surveyId, JSON.stringify(config), updatedAt);
    return { config, configUpdatedAt: updatedAt };
  });
}

export async function reviewCleaningSubmission(
  surveyId: string,
  ownerId: string,
  actorId: string,
  rawInput: unknown,
): Promise<CleaningReview> {
  const input = cleaningReviewInputSchema.parse(rawInput);
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    const submission = await getDb()
      .prepare('SELECT revision FROM submissions WHERE id = ? AND survey_id = ?' + getDb().lockSuffix)
      .get(input.submissionId, surveyId);
    if (!submission) throw new AppError('Respons tidak ditemukan.', 404);
    if (Number(submission.revision) !== input.revision)
      throw new AppError('Jawaban telah dikoreksi. Muat ulang dan tinjau versi terbaru.', 409);
    const previous = await getDb()
      .prepare('SELECT reviewed_at FROM cleaning_reviews WHERE submission_id = ? AND survey_id = ?')
      .get(input.submissionId, surveyId);
    const previousAt = previous ? String(previous.reviewed_at) : null;
    if (previousAt !== input.expectedReviewedAt)
      throw new AppError('Tinjauan telah diperbarui oleh pengelola lain. Muat ulang data.', 409);
    const at = nextTimestamp(previousAt);
    await getDb()
      .prepare(
        'INSERT INTO cleaning_reviews(submission_id, survey_id, status, reason, revision, actor, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO UPDATE SET status = excluded.status, reason = excluded.reason, revision = excluded.revision, actor = excluded.actor, reviewed_at = excluded.reviewed_at',
      )
      .run(input.submissionId, surveyId, input.status, input.reason, input.revision, actorId, at);
    await getDb()
      .prepare(
        'INSERT INTO cleaning_review_audit(id, survey_id, submission_id, status, reason, revision, actor, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        randomUUID(),
        surveyId,
        input.submissionId,
        input.status,
        input.reason,
        input.revision,
        actorId,
        at,
      );
    return {
      status: input.status,
      reason: input.reason,
      revision: input.revision,
      actor: actorId,
      reviewedAt: at,
      stale: false,
    };
  });
}

export async function getCleaningPage(
  surveyId: string,
  ownerId: string,
  rawInput: unknown,
): Promise<CleaningPage> {
  const input = cleaningQuerySchema.parse(rawInput);
  const survey = await getSurvey(surveyId, ownerId);
  const [settings, submissions, reviews, history] = await Promise.all([
    readSettings(surveyId),
    listSubmissions(surveyId),
    getDb().prepare('SELECT * FROM cleaning_reviews WHERE survey_id = ?').all(surveyId),
    getDb()
      .prepare('SELECT * FROM cleaning_review_audit WHERE survey_id = ? ORDER BY at DESC, id LIMIT 100')
      .all(surveyId),
  ]);
  const { config, configUpdatedAt } = settings;
  const detected = detectCleaningFlags(survey, submissions, config);
  const reviewById = new Map(reviews.map((row) => [String(row.submission_id), row]));
  let focusIds: Set<string> | undefined;
  if (input.focus) {
    if (!submissions.some((row) => row.id === input.focus))
      throw new AppError('Respons tidak ditemukan.', 404);
    focusIds = new Set([input.focus]);
    for (const groups of Object.values(detected.groups))
      for (const ids of groups.values())
        if (ids.includes(input.focus)) for (const id of ids) focusIds.add(id);
  }
  const filteredRows = submissions.filter((row) => {
    if (focusIds) return focusIds.has(row.id);
    const flags = detected.flags.get(row.id) ?? [];
    if (input.flaggedOnly === 'true' && !flags.length) return false;
    if (input.flag !== 'all' && !flags.some((flag) => flag.kind === input.flag)) return false;
    const saved = reviewById.get(row.id);
    const status = saved && Number(saved.revision) === row.revision ? String(saved.status) : 'unreviewed';
    return input.status === 'all' || status === input.status;
  });
  filteredRows.sort((a, b) => {
    if (input.focus && (a.id === input.focus || b.id === input.focus)) return a.id === input.focus ? -1 : 1;
    return b.submittedAt.localeCompare(a.submittedAt) || a.id.localeCompare(b.id);
  });
  const page = Math.min(input.page, Math.max(1, Math.ceil(filteredRows.length / input.pageSize)));
  const rows: CleaningRow[] = filteredRows
    .slice((page - 1) * input.pageSize, page * input.pageSize)
    .map((row) => {
      const saved = reviewById.get(row.id);
      return {
        id: row.id,
        submittedAt: row.submittedAt,
        revision: row.revision,
        ...cleaningIdentity(survey, row, config),
        flags: detected.flags.get(row.id) ?? [],
        review: saved ? parseReview(saved, row.revision) : null,
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
      };
    });
  const audit: CleaningAuditEntry[] = history.map((row) => ({
    id: String(row.id),
    submissionId: String(row.submission_id),
    status: z.enum(cleaningStatuses).parse(row.status),
    reason: String(row.reason),
    revision: Number(row.revision),
    actor: String(row.actor),
    at: String(row.at),
  }));
  return {
    config,
    configUpdatedAt,
    rows,
    total: submissions.length,
    flagged: detected.flags.size,
    filtered: filteredRows.length,
    page,
    pageSize: input.pageSize,
    focus: input.focus ?? null,
    audit,
  };
}
