import { z } from 'zod';
import type { Question } from './types';
import { questionSchema } from './model';
const choice = z.object({
  type: z.enum(['RADIO', 'CHECKBOX', 'DROP_DOWN']),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(300),
        isOther: z.boolean().optional(),
        goToAction: z.string().optional(),
        goToSectionId: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
  shuffle: z.boolean().optional(),
});
const question = z
  .object({
    required: z.boolean().optional(),
    choiceQuestion: choice.optional(),
    textQuestion: z.object({ paragraph: z.boolean().optional() }).optional(),
    scaleQuestion: z
      .object({
        low: z.number().int(),
        high: z.number().int(),
        lowLabel: z.string().max(200).optional(),
        highLabel: z.string().max(200).optional(),
      })
      .optional(),
    dateQuestion: z
      .object({ includeTime: z.boolean().optional(), includeYear: z.boolean().optional() })
      .optional(),
  })
  .passthrough();
const formSchema = z.object({
  info: z.object({ title: z.string().trim().min(3).max(200), description: z.string().max(3000).optional() }),
  items: z
    .array(
      z
        .object({
          title: z.string().max(500).optional(),
          description: z.string().max(1000).optional(),
          questionItem: z.object({ question }).optional(),
        })
        .passthrough(),
    )
    .max(100),
  settings: z
    .object({
      quizSettings: z.object({ isQuiz: z.boolean().optional() }).optional(),
      emailCollectionType: z.string().optional(),
    })
    .optional(),
});
export function parseFormsImport(input: unknown) {
  const form = formSchema.parse(input);
  const questions: Question[] = [];
  const warnings: string[] = [];
  if (form.settings?.quizSettings?.isQuiz)
    warnings.push('Penilaian kuis dan kunci jawaban tidak dipindahkan.');
  if (form.settings?.emailCollectionType && form.settings.emailCollectionType !== 'DO_NOT_COLLECT')
    warnings.push(
      'Pengumpulan email otomatis tidak dipindahkan. Tambahkan pertanyaan email bila diperlukan.',
    );
  form.items.forEach((item, index) => {
    const q = item.questionItem?.question;
    const label = item.title?.trim();
    const prefix = `Item ${index + 1}${label ? `: ${label}` : ''}`;
    if (!q || !label) {
      warnings.push(`${prefix}: bagian, media, grid, atau judul kosong dilewati.`);
      return;
    }
    const base: Question = {
      id: `import-q-${index + 1}`,
      label,
      description: item.description ?? '',
      required: !!q.required,
      type: 'text',
      options: [],
      scored: false,
    };
    if (q.choiceQuestion) {
      const values = q.choiceQuestion.options.filter((option) => !option.isOther);
      if (values.length !== q.choiceQuestion.options.length)
        warnings.push(`${prefix}: opsi “Lainnya” yang diisi bebas dilewati.`);
      if (values.length < 2) {
        warnings.push(`${prefix}: tidak ada opsi tetap; pertanyaan dilewati.`);
        return;
      }
      base.type = q.choiceQuestion.type === 'CHECKBOX' ? 'checkbox' : 'choice';
      base.options = values.map((option, n) => ({ id: `option-${n + 1}`, label: option.value }));
      if (q.choiceQuestion.options.some((option) => option.goToAction || option.goToSectionId))
        warnings.push(`${prefix}: percabangan ke bagian tidak dipindahkan.`);
      if (q.choiceQuestion.shuffle) warnings.push(`${prefix}: pengacakan opsi tidak dipindahkan.`);
    } else if (q.textQuestion) base.type = q.textQuestion.paragraph ? 'textarea' : 'text';
    else if (q.scaleQuestion) {
      const scale = q.scaleQuestion;
      if (scale.low !== 1 || scale.high < 2 || scale.high > 10) {
        warnings.push(`${prefix}: skala yang didukung mulai dari 1, maksimal 10; dilewati.`);
        return;
      }
      base.type = 'rating';
      base.options = Array.from({ length: scale.high }, (_, n) => ({
        id: String(n + 1),
        label: String(n + 1),
      }));
      base.description = [
        base.description,
        scale.lowLabel ? `1: ${scale.lowLabel}` : '',
        scale.highLabel ? `${scale.high}: ${scale.highLabel}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    } else if (q.dateQuestion) {
      base.type = 'date';
      if (q.dateQuestion.includeTime)
        warnings.push(`${prefix}: hanya tanggal yang dipindahkan, tanpa waktu.`);
    } else {
      warnings.push(`${prefix}: jenis pertanyaan belum didukung dan dilewati.`);
      return;
    }
    questionSchema.parse(base);
    questions.push(base);
  });
  if (!questions.length) throw new Error('Tidak ada pertanyaan yang dapat diimpor dari JSON ini.');
  return { title: form.info.title, description: form.info.description ?? '', questions, warnings };
}
