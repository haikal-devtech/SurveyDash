import type { Survey, Submission, SurveyInsights, Distribution, Question } from './types';
import { answerLabel } from './model';
import type { ResponseTimeline, QuestionBreakdown } from './analytics-model';
const DAY = 86400000;
export class InsightAccumulator {
  total = 0;
  revisions = 0;
  latest = '';
  private days = new Map<number, number>();
  private fields: {
    answered: number;
    count: Map<string, number>;
    scores: number;
    scored: number;
    samples: { at: string; value: string }[];
  }[];
  constructor(
    private survey: Survey,
    private samples = false,
  ) {
    this.fields = survey.questions.map((q) => ({
      answered: 0,
      count: new Map(q.options.map((o) => [o.label, 0])),
      scores: 0,
      scored: 0,
      samples: [],
    }));
  }
  add(row: Submission) {
    this.total++;
    this.revisions += row.revision;
    if (row.submittedAt > this.latest) this.latest = row.submittedAt;
    const time = Date.parse(row.submittedAt);
    if (Number.isFinite(time)) {
      const day = Math.floor((time + 7 * 3600000) / DAY);
      this.days.set(day, (this.days.get(day) ?? 0) + 1);
    }
    const snapshots = new Map(row.questionSnapshot.map((q) => [q.id, q]));
    this.survey.questions.forEach((q, index) => {
      const answer = row.answers[q.id],
        field = this.fields[index];
      const filled =
        answer !== undefined &&
        answer !== '' &&
        (typeof answer !== 'string' || !!answer.trim()) &&
        (!Array.isArray(answer) || answer.length > 0);
      if (filled) field.answered++;
      const snapshot = snapshots.get(q.id);
      if (q.scored) {
        const score = snapshot?.options.find((o) => o.id === answer)?.score;
        if (score !== undefined) {
          field.scores += score;
          field.scored++;
        }
      }
      if (q.options.length && answer !== undefined && answer !== '')
        for (const value of Array.isArray(answer) ? answer : [answer]) {
          const label = q.options.find((o) => o.id === value)?.label ?? answerLabel(snapshot ?? q, value);
          field.count.set(label, (field.count.get(label) ?? 0) + 1);
        }
      if (
        this.samples &&
        !q.options.length &&
        answer !== undefined &&
        answer !== '' &&
        (field.samples.length < 50 || row.submittedAt > field.samples.at(-1)!.at)
      ) {
        field.samples.push({
          at: row.submittedAt,
          value: answerLabel(q, answer).slice(0, 500) + (answerLabel(q, answer).length > 500 ? '…' : ''),
        });
        field.samples.sort((a, b) => b.at.localeCompare(a.at));
        if (field.samples.length > 50) field.samples.pop();
      }
    });
  }
  finish(): SurveyInsights {
    const distributions = this.survey.questions.map((q, index): Distribution[] =>
      [...this.fields[index].count].map(([name, count]) => ({
        name,
        count,
        score: q.options.find((o) => o.label === name)?.score,
      })),
    );
    const indicators = this.survey.questions.flatMap((q, index) =>
      q.scored
        ? [
            {
              id: q.id,
              label: q.label,
              average: this.fields[index].scored ? this.fields[index].scores / this.fields[index].scored : 0,
              answered: this.fields[index].scored,
              missing: this.total - this.fields[index].scored,
              distribution: distributions[index],
            },
          ]
        : [],
    );
    const ikm =
      this.survey.kind === 'skm' && indicators.length === 9 && indicators.every((i) => i.answered > 0)
        ? Number(((indicators.reduce((sum, i) => sum + i.average, 0) / 9) * 25).toFixed(2))
        : null;
    const grade = ikm === null ? '—' : ikm >= 88.31 ? 'A' : ikm >= 76.61 ? 'B' : ikm >= 65 ? 'C' : 'D';
    const category = {
      A: 'Sangat baik',
      B: 'Baik',
      C: 'Kurang baik',
      D: 'Tidak baik',
      '—': 'Belum ada nilai',
    }[grade];
    return {
      stats: {
        total: this.total,
        indicators,
        ikm,
        grade,
        category,
        completion: Math.round((this.total / this.survey.target) * 100),
      },
      timeline: this.timeline(),
      sourceRevision: `${this.survey.version}:${this.total}:${this.revisions}:${this.latest}`,
      questions: Object.fromEntries(
        this.survey.questions.map((q, index) => [
          q.id,
          {
            answered: this.fields[index].answered,
            distribution: q.options.length ? distributions[index] : [],
            samples: this.fields[index].samples.map((sample) => sample.value),
          },
        ]),
      ),
    };
  }
  private timeline(): ResponseTimeline {
    if (!this.days.size) return { points: [], intervalDays: 1, start: '', end: '', total: 0 };
    let first = Infinity,
      last = -Infinity,
      total = 0;
    for (const [day, count] of this.days) {
      first = Math.min(first, day);
      last = Math.max(last, day);
      total += count;
    }
    const intervalDays = Math.max(1, Math.ceil((last - first + 1) / 60));
    const counts = Array.from({ length: Math.floor((last - first) / intervalDays) + 1 }, () => 0);
    for (const [day, count] of this.days) counts[Math.floor((day - first) / intervalDays)] += count;
    const label = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
    return {
      points: counts.map((count, index) => ({ name: label(first + index * intervalDays), count })),
      intervalDays,
      start: label(first),
      end: label(last),
      total,
    };
  }
}
export async function streamingBreakdown(
  question: Question,
  read: () => AsyncIterable<Submission>,
): Promise<QuestionBreakdown> {
  const counts = new Map(question.options.map((option) => [option.label, 0]));
  let total = 0,
    answered = 0,
    numbers = 0,
    minimum = Infinity,
    maximum = -Infinity,
    longText = false,
    diverse = false;
  for await (const row of read()) {
    total++;
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
      numbers++;
      minimum = Math.min(minimum, answer);
      maximum = Math.max(maximum, answer);
      continue;
    }
    for (const value of Array.isArray(answer) ? answer : [answer]) {
      const label = question.options.find((option) => option.id === value)?.label ?? String(value);
      if (label.length > 160) {
        longText = true;
        continue;
      }
      if (!diverse) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
        if (!question.options.length && counts.size > 50) diverse = true;
      }
    }
  }
  const result: QuestionBreakdown = {
    questionId: question.id,
    answered,
    total,
    rows: [],
    unit: question.type === 'checkbox' ? 'pilihan' : 'jawaban',
    note:
      question.type === 'checkbox'
        ? 'Persentase dari seluruh pilihan. Satu responden dapat memilih lebih dari satu.'
        : 'Jawaban kosong tidak dimasukkan ke persentase.',
  };
  if (question.type === 'number' && numbers) {
    if (minimum === maximum) result.rows = [{ name: String(minimum), count: numbers }];
    else {
      const size = Math.min(10, Math.ceil(Math.sqrt(numbers))),
        step = (maximum - minimum) / size;
      if (!Number.isFinite(step) || step <= 0)
        return {
          ...result,
          unavailable: 'Rentang angka terlalu besar untuk dikelompokkan. Lihat nilai lengkap di tab Data.',
        };
      const bins = Array.from({ length: size }, (_, index) => ({
        name: `${Number((minimum + index * step).toPrecision(5))}–${Number((index === size - 1 ? maximum : minimum + (index + 1) * step).toPrecision(5))}`,
        count: 0,
      }));
      for await (const row of read()) {
        const value = row.answers[question.id];
        if (typeof value === 'number' && Number.isFinite(value))
          bins[Math.min(size - 1, Math.floor((value - minimum) / step))].count++;
      }
      result.rows = bins;
      result.note = 'Angka dikelompokkan ke rentang. Batas atas hanya masuk pada rentang terakhir.';
    }
  } else if (longText || diverse)
    result.unavailable =
      'Jawaban terlalu beragam atau panjang untuk grafik kategori. Lihat isi lengkapnya di tab Data.';
  else result.rows = [...counts].map(([name, count]) => ({ name, count }));
  return result;
}
