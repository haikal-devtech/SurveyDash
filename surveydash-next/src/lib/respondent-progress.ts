import type { Answer, Question } from './types';

export function respondentProgress(
  questions: Pick<Question, 'id' | 'required'>[],
  answers: Record<string, Answer>,
) {
  const filled = (id: string) => {
    const value = answers[id];
    return Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && String(value).trim() !== '';
  };
  const required = questions.filter((question) => question.required);
  const missing = required.filter((question) => !filled(question.id)).map((question) => question.id);
  return {
    total: questions.length,
    answered: questions.filter((question) => filled(question.id)).length,
    required: required.length,
    remainingRequired: missing.length,
    missing,
  };
}
