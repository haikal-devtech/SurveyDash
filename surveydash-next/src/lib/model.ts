import { z } from 'zod';
import type { Answer, Distribution, Question, Submission, Survey, SurveyStats, WidgetType } from './types';

export class ModelError extends Error {}

export const questionSchema = z
  .object({
    id: z.string().min(1).max(100),
    label: z.string().trim().min(1).max(500),
    description: z.string().max(2000),
    type: z.enum(['text', 'textarea', 'choice', 'checkbox', 'rating', 'number', 'date']),
    required: z.boolean(),
    scored: z.boolean(),
    options: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          label: z.string().trim().min(1).max(300),
          score: z.number().int().min(1).max(4).optional(),
        }),
      )
      .max(50),
  })
  .superRefine((q, ctx) => {
    if (['choice', 'checkbox', 'rating'].includes(q.type) && q.options.length < 2)
      ctx.addIssue({ code: 'custom', message: 'Pertanyaan pilihan perlu minimal dua opsi.' });
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length)
      ctx.addIssue({ code: 'custom', message: 'ID pilihan harus unik.' });
    if (q.scored && (!['choice', 'rating'].includes(q.type) || q.options.some((o) => o.score === undefined)))
      ctx.addIssue({ code: 'custom', message: 'Unsur SKM harus memiliki skor 1–4 untuk setiap pilihan.' });
  });
export const surveyInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().max(3000),
    institution: z.string().max(200),
    kind: z.enum(['skm', 'custom']),
    status: z.enum(['draft', 'open', 'closed']),
    visibility: z.enum(['public', 'link', 'private']),
    target: z.number().int().min(1).max(10000000),
    version: z.number().int().min(1),
    questions: z.array(questionSchema).min(1).max(100),
    widgets: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          type: z.enum(['pie', 'bar', 'table', 'metric', 'text']),
          title: z.string().max(300),
          questionId: z.string().max(100).optional(),
          content: z.string().max(3000).optional(),
          x: z.number().int().min(0).max(11),
          y: z.number().int().min(0).max(1000),
          w: z.number().int().min(2).max(12),
          h: z.number().int().min(2).max(20),
        }),
      )
      .max(50),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.questions.map((q) => q.id)).size !== s.questions.length)
      ctx.addIssue({ code: 'custom', message: 'ID pertanyaan harus unik.' });
    if (new Set(s.widgets.map((w) => w.id)).size !== s.widgets.length)
      ctx.addIssue({ code: 'custom', message: 'ID komponen harus unik.' });
    if (s.kind === 'skm' && s.questions.filter((q) => q.scored).length !== 9)
      ctx.addIssue({ code: 'custom', message: 'Survei SKM harus mempunyai tepat 9 unsur yang diberi skor.' });
    s.widgets.forEach((w) => {
      if (w.x + w.w > 12) ctx.addIssue({ code: 'custom', message: 'Komponen melebihi lebar kanvas.' });
      const question = s.questions.find((q) => q.id === w.questionId);
      if (['pie', 'bar', 'table'].includes(w.type) && !question)
        ctx.addIssue({ code: 'custom', message: 'Pilih pertanyaan untuk komponen grafik atau tabel.' });
      if (question && !allowedWidgets(question).includes(w.type))
        ctx.addIssue({ code: 'custom', message: 'Jenis grafik tidak sesuai dengan pertanyaan.' });
    });
  });

export function allowedWidgets(q: Question): WidgetType[] {
  return ['choice', 'checkbox', 'rating'].includes(q.type) ? ['bar', 'pie', 'table'] : ['table'];
}

export function validateAnswers(questions: Question[], input: unknown): Record<string, Answer> {
  const raw = z
    .record(
      z.string(),
      z.union([z.string().max(10000), z.number().finite(), z.array(z.string().max(100)).max(50)]),
    )
    .parse(input);
  const result: Record<string, Answer> = {};
  for (const q of questions) {
    const value = raw[q.id];
    const empty =
      value === undefined ||
      value === '' ||
      (typeof value === 'string' && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (q.required) throw new ModelError(`Pertanyaan "${q.label}" wajib diisi.`);
      continue;
    }
    if (q.type === 'choice' || q.type === 'rating') {
      if (typeof value !== 'string' || !q.options.some((o) => o.id === value))
        throw new ModelError(`Pilihan untuk "${q.label}" tidak valid.`);
    } else if (q.type === 'checkbox') {
      if (
        !Array.isArray(value) ||
        new Set(value).size !== value.length ||
        value.some((v) => !q.options.some((o) => o.id === v))
      )
        throw new ModelError(`Pilihan untuk "${q.label}" tidak valid.`);
    } else if (q.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new ModelError(`"${q.label}" harus berupa angka.`);
    } else {
      if (typeof value !== 'string') throw new ModelError(`Jawaban untuk "${q.label}" tidak valid.`);
      if (
        q.type === 'date' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value)
      )
        throw new ModelError('Tanggal tidak valid.');
    }
    result[q.id] = value;
  }
  return result;
}

export function answerLabel(q: Question, value: Answer | undefined): string {
  if (value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map((v) => q.options.find((o) => o.id === v)?.label ?? v).join(', ');
  return q.options.find((o) => o.id === value)?.label ?? String(value);
}

export function distribution(q: Question, rows: Submission[]): Distribution[] {
  const counts = new Map<string, number>();
  q.options.forEach((o) => counts.set(o.label, 0));
  for (const row of rows) {
    const answer = row.answers[q.id];
    if (answer === undefined || answer === '') continue;
    const snapshot = row.questionSnapshot.find((p) => p.id === q.id) ?? q;
    const values = Array.isArray(answer) ? answer : [answer];
    values.forEach((v) => {
      const label = q.options.find((o) => o.id === v)?.label ?? answerLabel(snapshot, v);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  }
  return Array.from(counts, ([name, count]) => ({
    name,
    count,
    score: q.options.find((o) => o.label === name)?.score,
  }));
}

export function calculateStats(survey: Survey, rows: Submission[]): SurveyStats {
  const indicators = survey.questions
    .filter((q) => q.scored)
    .map((q) => {
      const scores = rows.flatMap((row) => {
        const snapshot = row.questionSnapshot.find((p) => p.id === q.id);
        const score = snapshot?.options.find((o) => o.id === row.answers[q.id])?.score;
        return score === undefined ? [] : [score];
      });
      return {
        id: q.id,
        label: q.label,
        average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        answered: scores.length,
        missing: rows.length - scores.length,
        distribution: distribution(q, rows),
      };
    });
  const ikm =
    survey.kind === 'skm' && indicators.length === 9 && indicators.every((i) => i.answered > 0)
      ? Number(((indicators.reduce((sum, i) => sum + i.average, 0) / 9) * 25).toFixed(2))
      : null;
  const grade = ikm === null ? '—' : ikm >= 88.31 ? 'A' : ikm >= 76.61 ? 'B' : ikm >= 65 ? 'C' : 'D';
  const categories: Record<string, string> = {
    A: 'Sangat baik',
    B: 'Baik',
    C: 'Kurang baik',
    D: 'Tidak baik',
  };
  return {
    total: rows.length,
    indicators,
    ikm,
    grade,
    category: ikm === null ? 'Belum ada nilai' : categories[grade],
    completion: Math.round((rows.length / survey.target) * 100),
  };
}

export function canAccessForm(survey: Survey) {
  return survey.status !== 'draft' && survey.visibility !== 'private';
}
export function assertAcceptingResponses(survey: Survey) {
  if (!canAccessForm(survey)) throw new ModelError('Form tidak tersedia.');
  if (survey.status !== 'open') throw new ModelError('Survei sudah ditutup. Jawaban baru tidak diterima.');
}

export function assertSchemaCompatible(
  before: Survey,
  after: Pick<Survey, 'questions'>,
  hasResponses: boolean,
) {
  if (!hasResponses) return;
  for (const q of before.questions) {
    const next = after.questions.find((p) => p.id === q.id);
    if (
      !next ||
      next.type !== q.type ||
      next.scored !== q.scored ||
      JSON.stringify(next.options) !== JSON.stringify(q.options)
    ) {
      throw new ModelError(
        'Pertanyaan yang sudah memiliki respons tidak bisa dihapus atau diubah jenis/pilihan/skornya. Duplikasikan survei untuk versi baru.',
      );
    }
  }
}

export function csvCell(value: string) {
  // Spreadsheet applications must treat user-authored formulas as text.
  const safe = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
