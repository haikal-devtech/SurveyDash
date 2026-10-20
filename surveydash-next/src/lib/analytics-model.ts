import type { Distribution, Question, Submission } from './types';
const DAY = 86_400_000;
export interface ResponseTimeline {
  points: Distribution[];
  intervalDays: number;
  start: string;
  end: string;
  total: number;
}
/** Bucket every valid submission in WIB, including gaps, without dropping older history. */
export function responseTimeline(rows: Pick<Submission, 'submittedAt'>[], maxPoints = 60): ResponseTimeline {
  const days = rows
    .map((row) => Date.parse(row.submittedAt))
    .filter(Number.isFinite)
    .map((time) => Math.floor((time + 7 * 3600_000) / DAY));
  if (!days.length) return { points: [], intervalDays: 1, start: '', end: '', total: 0 };
  let first = Infinity,
    last = -Infinity;
  for (const day of days) {
    first = Math.min(first, day);
    last = Math.max(last, day);
  }
  const intervalDays = Math.max(1, Math.ceil((last - first + 1) / Math.max(1, maxPoints)));
  const counts = Array.from({ length: Math.floor((last - first) / intervalDays) + 1 }, () => 0);
  for (const day of days) counts[Math.floor((day - first) / intervalDays)]++;
  const label = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
  return {
    points: counts.map((count, index) => ({ name: label(first + index * intervalDays), count })),
    intervalDays,
    start: label(first),
    end: label(last),
    total: days.length,
  };
}
export interface QuestionBreakdown {
  questionId: string;
  answered: number;
  total: number;
  rows: Distribution[];
  unit: 'jawaban' | 'pilihan';
  note: string;
  unavailable?: string;
}
/** Owner-requested exploration only; never write inferred options back into the public form. */
export function questionBreakdown(question: Question, submissions: Submission[]): QuestionBreakdown {
  const counts = new Map(question.options.map((option) => [option.label, 0]));
  let answered = 0;
  let longText = false;
  const numbers: number[] = [];
  for (const row of submissions) {
    const answer = row.answers[question.id];
    if (
      answer === undefined ||
      answer === '' ||
      (typeof answer === 'string' && !answer.trim()) ||
      (Array.isArray(answer) && !answer.length)
    )
      continue;
    answered++;
    if (question.type === 'number' && typeof answer === 'number' && Number.isFinite(answer)) {
      numbers.push(answer);
      continue;
    }
    const values = Array.isArray(answer) ? answer : [answer];
    for (const value of values) {
      const label = question.options.find((option) => option.id === value)?.label ?? String(value);
      if (label.length > 160) {
        longText = true;
        continue;
      }
      if (counts.size <= 100 || counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  const result: QuestionBreakdown = {
    questionId: question.id,
    answered,
    total: submissions.length,
    rows: [],
    unit: question.type === 'checkbox' ? 'pilihan' : 'jawaban',
    note:
      question.type === 'checkbox'
        ? 'Persentase dari seluruh pilihan. Satu responden dapat memilih lebih dari satu.'
        : 'Jawaban kosong tidak dimasukkan ke persentase.',
  };
  if (question.type === 'number' && numbers.length) {
    let min = Infinity,
      max = -Infinity;
    for (const value of numbers) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    if (min === max) result.rows = [{ name: String(min), count: numbers.length }];
    else {
      const size = Math.min(10, Math.ceil(Math.sqrt(numbers.length)));
      const step = (max - min) / size;
      if (!Number.isFinite(step) || step <= 0)
        return {
          ...result,
          unavailable: 'Rentang angka terlalu besar untuk dikelompokkan. Lihat nilai lengkap di tab Data.',
        };
      const bins = Array.from({ length: size }, (_, i) => ({
        name: `${Number((min + i * step).toPrecision(5))}–${Number((i === size - 1 ? max : min + (i + 1) * step).toPrecision(5))}`,
        count: 0,
      }));
      for (const value of numbers) bins[Math.min(size - 1, Math.floor((value - min) / step))].count++;
      result.rows = bins;
      result.note = 'Angka dikelompokkan ke rentang. Batas atas hanya masuk pada rentang terakhir.';
    }
  } else if (longText || (!question.options.length && counts.size > 50)) {
    result.unavailable =
      'Jawaban terlalu beragam atau panjang untuk grafik kategori. Lihat isi lengkapnya di tab Data.';
  } else result.rows = [...counts].map(([name, count]) => ({ name, count }));
  return result;
}
export function chartSeries(data: Distribution[], limit = 10) {
  const rows = data.filter((row) => Number.isFinite(row.count) && row.count >= 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const grouped = rows.length > limit;
  const visible = grouped
    ? [
        ...rows.slice(0, limit - 1),
        {
          name: 'Kategori lainnya (gabungan)',
          count: rows.slice(limit - 1).reduce((sum, row) => sum + row.count, 0),
        },
      ]
    : rows;
  return { rows: visible, total, grouped, categories: rows.length };
}
