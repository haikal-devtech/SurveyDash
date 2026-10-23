import { z } from 'zod';
import { answerLabel, ModelError } from './model';
import type { Answer, Question, Submission, Survey } from './types';

export const cleaningStatuses = ['unreviewed', 'valid', 'needs_verification', 'excluded'] as const;
export type CleaningStatus = (typeof cleaningStatuses)[number];
export const cleaningStatusLabels: Record<CleaningStatus, string> = {
  unreviewed: 'Belum ditinjau',
  valid: 'Diterima',
  needs_verification: 'Perlu verifikasi',
  excluded: 'Dikeluarkan',
};
export const cleaningConfigSchema = z.object({
  nameQuestionId: z.string().min(1).max(100).optional(),
  bankQuestionId: z.string().min(1).max(100).optional(),
  accountQuestionId: z.string().min(1).max(100).optional(),
});
export type CleaningConfig = z.infer<typeof cleaningConfigSchema>;
export type CleaningFlagKind = 'name' | 'account' | 'answers';
export type CleaningFlag = { kind: CleaningFlagKind; count: number; sampleIds: string[] };
export const cleaningFlagLabels: Record<CleaningFlagKind, string> = {
  name: 'Nama sama',
  account: 'Bank dan rekening sama',
  answers: 'Jawaban identik',
};
export type CleaningReview = {
  status: CleaningStatus;
  reason: string;
  revision: number;
  actor: string;
  reviewedAt: string;
  stale: boolean;
};
export type CleaningAuditEntry = Omit<CleaningReview, 'stale' | 'reviewedAt'> & {
  id: string;
  submissionId: string;
  at: string;
};
export type CleaningRow = {
  reportedSeconds?: number | null;
  id: string;
  submittedAt: string;
  revision: number;
  name: string;
  bank: string;
  accountMasked: string;
  flags: CleaningFlag[];
  review: CleaningReview | null;
  comparison?: { questionId: string; label: string; value: string; truncated: boolean }[];
};
export type CleaningPage = {
  indexing?: { done: number; total: number };
  config: CleaningConfig;
  configUpdatedAt: string | null;
  rows: CleaningRow[];
  total: number;
  flagged: number;
  filtered: number;
  page: number;
  pageSize: number;
  focus: string | null;
  audit: CleaningAuditEntry[];
};

export function validateCleaningConfig(survey: Pick<Survey, 'questions'>, input: unknown): CleaningConfig {
  const config = cleaningConfigSchema.parse(input);
  const fields = Object.values(config).filter((value) => value !== undefined);
  if (new Set(fields).size !== fields.length)
    throw new ModelError('Gunakan pertanyaan berbeda untuk nama, bank, dan nomor rekening.');
  if (!!config.bankQuestionId !== !!config.accountQuestionId)
    throw new ModelError('Pilih pertanyaan bank dan nomor rekening bersama, atau kosongkan keduanya.');
  const question = (id: string | undefined) => survey.questions.find((item) => item.id === id);
  if (config.nameQuestionId && !['text', 'textarea'].includes(question(config.nameQuestionId)?.type ?? ''))
    throw new ModelError('Pertanyaan nama harus berupa jawaban singkat atau paragraf.');
  if (config.bankQuestionId && !['text', 'choice'].includes(question(config.bankQuestionId)?.type ?? ''))
    throw new ModelError('Pertanyaan bank harus berupa jawaban singkat atau pilihan tunggal.');
  if (config.accountQuestionId && question(config.accountQuestionId)?.type !== 'text')
    throw new ModelError('Nomor rekening harus berupa jawaban singkat agar angka nol di depan tersimpan.');
  return config;
}

export function normalizeIdentity(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('id-ID');
}
export function normalizeAccount(value: string): string {
  return normalizeIdentity(value).replace(/[\s.\-]/gu, '');
}
export function maskAccount(value: string): string {
  const normalized = normalizeAccount(value);
  if (!normalized) return '—';
  return normalized.length <= 4 ? '••••' : '•••• ' + normalized.slice(-4);
}
function textAnswer(row: Submission, question: Question | undefined) {
  if (!question) return '';
  const value = row.answers[question.id];
  return typeof value === 'string' && value.trim() ? answerLabel(question, value).trim() : '';
}
function canonicalAnswer(value: Answer | undefined) {
  if (value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length ? [...value].sort() : null;
  return typeof value === 'string' ? normalizeIdentity(value) || null : value;
}
export function answerFingerprint(
  survey: Pick<Survey, 'questions'>,
  row: Submission,
  config: CleaningConfig,
) {
  const identities = new Set(Object.values(config));
  const values = survey.questions
    .filter((question) => !identities.has(question.id))
    .map((question) => [question.id, canonicalAnswer(row.answers[question.id])])
    .sort(([left], [right]) => String(left).localeCompare(String(right)));
  return values.some(([, value]) => value !== null) ? JSON.stringify(values) : '';
}

/** These groups describe similarity only. They never change answers or analytical eligibility. */
export function detectCleaningFlags(
  survey: Pick<Survey, 'questions'>,
  rows: Submission[],
  config: CleaningConfig,
) {
  const questions = new Map(survey.questions.map((question) => [question.id, question]));
  const groups: Record<CleaningFlagKind, Map<string, string[]>> = {
    name: new Map(),
    account: new Map(),
    answers: new Map(),
  };
  for (const row of rows) {
    const name = normalizeIdentity(textAnswer(row, questions.get(config.nameQuestionId ?? '')));
    const bank = normalizeIdentity(textAnswer(row, questions.get(config.bankQuestionId ?? '')));
    const account = normalizeAccount(textAnswer(row, questions.get(config.accountQuestionId ?? '')));
    const keys = {
      name,
      account: bank && account ? JSON.stringify([bank, account]) : '',
      answers: answerFingerprint(survey, row, config),
    };
    for (const kind of ['name', 'account', 'answers'] as const) {
      const key = keys[kind];
      if (!key) continue;
      const group = groups[kind].get(key);
      if (group) group.push(row.id);
      else groups[kind].set(key, [row.id]);
    }
  }
  const flags = new Map<string, CleaningFlag[]>();
  for (const kind of ['name', 'account', 'answers'] as const)
    for (const ids of groups[kind].values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const flag = {
          kind,
          count: ids.length,
          sampleIds: ids
            .slice(0, 11)
            .filter((peer) => peer !== id)
            .slice(0, 10),
        };
        const existing = flags.get(id);
        if (existing) existing.push(flag);
        else flags.set(id, [flag]);
      }
    }
  return { flags, groups };
}

export function cleaningIdentity(survey: Survey, row: Submission, config: CleaningConfig) {
  const question = (id: string | undefined) => survey.questions.find((item) => item.id === id);
  return {
    name: textAnswer(row, question(config.nameQuestionId)) || '—',
    bank: textAnswer(row, question(config.bankQuestionId)) || '—',
    accountMasked: maskAccount(textAnswer(row, question(config.accountQuestionId))),
  };
}
