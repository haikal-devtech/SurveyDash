import { z } from 'zod';
import { parseFormsImport } from './forms-import';
import { validateAnswers } from './model';
import type { Answer } from './types';

const responseSchema = z
  .object({
    responseId: z.string().min(1).max(200),
    createTime: z.iso.datetime({ offset: true }),
    lastSubmittedTime: z.iso.datetime({ offset: true }).optional(),
    respondentEmail: z.string().max(320).optional(),
    answers: z.record(z.string().max(200), z.unknown()).default({}),
  })
  .passthrough();
const textAnswers = z.object({
  textAnswers: z.object({ answers: z.array(z.object({ value: z.string() })).max(50) }),
});
export const MAX_IMPORT_BYTES = 10_000_000;
export const MAX_IMPORT_RESPONSES = 10_000;
export type FormImportPreview = {
  batchId: string;
  title: string;
  questions: { id: string; label: string }[];
  responseCount: number;
  warnings: string[];
};

/** The original response resource stays private, including unmapped fields and collected emails. */
export function parseFormWithResponses(input: unknown) {
  if (Buffer.byteLength(JSON.stringify(input) ?? '') > MAX_IMPORT_BYTES)
    throw new Error('Data impor maksimal 10 MB. Tidak ada data yang diimpor.');
  const bundle = z
    .object({
      form: z.unknown(),
      sourceKind: z.literal('google-sheets').optional(),
      responses: z.array(responseSchema).max(MAX_IMPORT_RESPONSES).default([]),
    })
    .parse(input && typeof input === 'object' && 'form' in input ? input : { form: input });
  const form = parseFormsImport(bundle.form);
  const sourceFormId = z.object({ formId: z.string().max(200).optional() }).parse(bundle.form).formId ?? '';
  const bySource = new Map(
    form.mapping.map((m) => [m.sourceId, form.questions.find((q) => q.id === m.questionId)!]),
  );
  if (bySource.size !== form.mapping.length)
    throw new Error('ID pertanyaan sumber berulang. Periksa form sumber.');
  const unique = new Map<string, z.infer<typeof responseSchema>>();
  for (const response of bundle.responses) {
    const previous = unique.get(response.responseId);
    if (
      !previous ||
      Date.parse(response.lastSubmittedTime ?? response.createTime) >=
        Date.parse(previous.lastSubmittedTime ?? previous.createTime)
    )
      unique.set(response.responseId, response);
  }
  let unmapped = 0;
  let missing = 0;
  const responses = [...unique.values()].map((source) => {
    const answers: Record<string, Answer> = {};
    for (const [sourceId, raw] of Object.entries(source.answers)) {
      const q = bySource.get(sourceId);
      const parsed = textAnswers.safeParse(raw);
      if (!q || !parsed.success) {
        unmapped++;
        continue;
      }
      const values = parsed.data.textAnswers.answers.map((a) => a.value);
      if (!values.length) continue;
      let value: Answer;
      if (q.options.length) {
        const ids = values.map((v) => {
          const matches = q.options.filter((o) => o.label === v);
          return matches.length === 1 ? matches[0].id : undefined;
        });
        // An unknown "Other" value must never become a public option label.
        if (ids.some((id) => !id) || (q.type !== 'checkbox' && ids.length !== 1)) {
          unmapped++;
          continue;
        }
        value = q.type === 'checkbox' ? [...new Set(ids as string[])] : ids[0]!;
      } else {
        if (values.length !== 1) {
          unmapped++;
          continue;
        }
        value = values[0];
      }
      try {
        Object.assign(answers, validateAnswers([{ ...q, required: false }], { [q.id]: value }));
      } catch {
        unmapped++;
      }
    }
    missing += form.questions.filter((q) => q.required && answers[q.id] === undefined).length;
    return {
      sourceId: source.responseId,
      submittedAt: new Date(source.lastSubmittedTime ?? source.createTime).toISOString(),
      answers,
      raw: source,
    };
  });
  const warnings = [...form.warnings];
  if (bundle.sourceKind === 'google-sheets')
    warnings.push(
      'Sumber Google Sheets: jawaban dipertahankan sebagai teks. Jenis pertanyaan, pilihan jawaban, percabangan, kewajiban isi, dan akun surveyor asli belum dipulihkan. Tinjau kolom dan isinya sebelum membuka form untuk pengumpulan baru.',
    );
  if (unmapped)
    warnings.push(
      `${unmapped} jawaban belum cocok dengan pertanyaan yang didukung. Data aslinya tetap disimpan dan tersedia pada unduhan Excel/CSV; belum masuk grafik.`,
    );
  if (missing)
    warnings.push(
      `${missing} isian wajib kosong pada data lama. Jawaban lama dipertahankan tanpa mengarang isian.`,
    );
  if (unique.size !== bundle.responses.length)
    warnings.push('Respons dengan ID sama digabung menggunakan versi terbaru.');
  if (responses.some((r) => JSON.stringify(r.raw).includes('fileUploadAnswers')))
    warnings.push('Nama dan ID lampiran disimpan pada data asli; berkas lampiran tetap di Google.');
  return { ...form, sourceFormId, warnings, responses };
}
