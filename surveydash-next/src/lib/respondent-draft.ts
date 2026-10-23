import type { Answer, Question } from './types';
export const DRAFT_TTL = 4 * 60 * 60 * 1000;
export type RespondentDraft = {
  version: 1;
  fingerprint: string;
  answers: Record<string, Answer>;
  requestKey: string;
  startedAt: string;
  savedAt: number;
  sent: boolean;
};
export function writeSentReceipt(
  storageKey: string,
  fingerprint: string,
  requestKey: string,
  startedAt: string,
) {
  const receipt: RespondentDraft = {
    version: 1,
    fingerprint,
    answers: {},
    requestKey,
    startedAt,
    savedAt: Date.now(),
    sent: true,
  };
  sessionStorage.setItem(storageKey, JSON.stringify(receipt));
  localStorage.removeItem(storageKey);
}
export function formFingerprint(questions: Question[]) {
  const source = JSON.stringify(
    questions.map((q) => [q.id, q.type, q.required, q.options, q.showWhen, q.validation]),
  );
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export function readRespondentDraft(
  raw: string | null,
  fingerprint: string,
  now = Date.now(),
): RespondentDraft | null {
  if (!raw || raw.length > 250000) return null;
  try {
    const draft = JSON.parse(raw) as RespondentDraft;
    if (
      draft.version !== 1 ||
      draft.fingerprint !== fingerprint ||
      !Number.isFinite(draft.savedAt) ||
      now - draft.savedAt > DRAFT_TTL ||
      draft.savedAt > now + 60000 ||
      !/^[a-f0-9-]{36}$/i.test(draft.requestKey) ||
      !Number.isFinite(Date.parse(draft.startedAt)) ||
      !draft.answers ||
      Array.isArray(draft.answers) ||
      typeof draft.answers !== 'object' ||
      typeof draft.sent !== 'boolean'
    )
      return null;
    for (const value of Object.values(draft.answers)) {
      if (typeof value === 'number' && Number.isFinite(value)) continue;
      if (typeof value === 'string' && value.length <= 10000) continue;
      if (
        Array.isArray(value) &&
        value.length <= 50 &&
        value.every((entry) => typeof entry === 'string' && entry.length <= 100)
      )
        continue;
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}
