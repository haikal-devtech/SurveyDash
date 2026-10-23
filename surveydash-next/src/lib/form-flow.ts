import type { Answer, Question } from './types';
export function visibleQuestions(questions: Question[], answers: Record<string, Answer>) {
  const visible = new Set<string>();
  return questions.filter((question) => {
    const rule = question.showWhen;
    if (!rule) {
      visible.add(question.id);
      return true;
    }
    const value = visible.has(rule.questionId) ? answers[rule.questionId] : undefined;
    const shown =
      rule.operator === 'answered'
        ? value !== undefined &&
          value !== '' &&
          (typeof value !== 'string' || !!value.trim()) &&
          (!Array.isArray(value) || value.length > 0)
        : value !== undefined &&
          (Array.isArray(value) ? value.includes(rule.value ?? '') : String(value) === rule.value);
    if (shown) visible.add(question.id);
    return shown;
  });
}
export function formPages(questions: Question[]) {
  const pages: { title: string; questions: Question[] }[] = [];
  for (const question of questions) {
    const title = question.section?.trim() || 'Pertanyaan';
    if (!pages.length || pages.at(-1)!.title !== title) pages.push({ title, questions: [] });
    pages.at(-1)!.questions.push(question);
  }
  return pages;
}
