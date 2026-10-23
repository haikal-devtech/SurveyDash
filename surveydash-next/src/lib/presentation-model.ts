import { z } from 'zod';
import { calculateStats, distribution } from './model';
import type { Distribution, Submission, Survey, SurveyInsights } from './types';
import { categoryChartTypes, trendChartTypes, type DataChartType } from './chart-types';
import { questionBreakdown, responseTimeline } from './analytics-model';
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;
export const themes = {
  professional: {
    name: 'Professional',
    background: '#ffffff',
    ink: '#20203d',
    accent: '#7549df',
    muted: '#777184',
  },
  minimal: { name: 'Minimal', background: '#ffffff', ink: '#222222', accent: '#45546c', muted: '#747474' },
  corporate: {
    name: 'Corporate',
    background: '#f4f7fa',
    ink: '#163753',
    accent: '#1b6a84',
    muted: '#607385',
  },
};
export type PresentationTheme = keyof typeof themes;
export interface DataBinding {
  kind: 'metric' | 'chart' | 'timeline';
  key?: 'total' | 'ikm' | 'grade' | 'completion' | 'category' | 'target' | 'summaryText';
  questionId?: string;
  chartType?: DataChartType;
}
export interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'chart' | 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  color: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  shape: 'rect' | 'rounded' | 'circle' | 'line';
  assetId?: string;
  fit: 'contain' | 'cover';
  binding?: DataBinding;
  data?: Distribution[];
  missing?: boolean;
}
export interface Slide {
  id: string;
  name: string;
  background: string;
  elements: SlideElement[];
}
export interface PresentationDocument {
  id: string;
  ownerId: string;
  surveyId: string;
  title: string;
  theme: PresentationTheme;
  slides: Slide[];
  version: number;
  sourceRevision: string;
  demo: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const bindingSchema = z
  .object({
    kind: z.enum(['metric', 'chart', 'timeline']),
    key: z.enum(['total', 'ikm', 'grade', 'completion', 'category', 'target', 'summaryText']).optional(),
    questionId: z.string().max(100).optional(),
    chartType: z.enum([...categoryChartTypes, ...trendChartTypes]).optional(),
  })
  .superRefine((b, ctx) => {
    if (b.kind === 'metric' && !b.key)
      ctx.addIssue({ code: 'custom', message: 'Pilih metrik untuk komponen data.' });
    if (b.kind === 'chart' && (!b.questionId || !b.chartType))
      ctx.addIssue({ code: 'custom', message: 'Pilih pertanyaan dan jenis grafik.' });
    if (b.kind === 'chart' && b.chartType && !(categoryChartTypes as readonly string[]).includes(b.chartType))
      ctx.addIssue({ code: 'custom', message: 'Gunakan grafik kategori untuk pertanyaan.' });
    if (
      b.kind === 'timeline' &&
      (b.questionId || !(trendChartTypes as readonly (string | undefined)[]).includes(b.chartType))
    )
      ctx.addIssue({ code: 'custom', message: 'Grafik tren memakai waktu respons dan jenis garis/area.' });
  });
export const slideElementSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum(['text', 'shape', 'chart', 'image']),
    x: z.number().finite().min(0).max(SLIDE_WIDTH),
    y: z.number().finite().min(0).max(SLIDE_HEIGHT),
    w: z.number().finite().min(10).max(SLIDE_WIDTH),
    h: z.number().finite().min(4).max(SLIDE_HEIGHT),
    text: z.string().max(10000),
    fontSize: z.number().min(8).max(160),
    fontFamily: z.enum(['Inter Variable', 'Arial', 'Georgia', 'monospace']),
    fontWeight: z.number().int().min(300).max(900),
    align: z.enum(['left', 'center', 'right']),
    lineHeight: z.number().min(1).max(3),
    color: hex,
    fill: hex,
    stroke: hex,
    strokeWidth: z.number().min(0).max(20),
    opacity: z.number().min(0).max(1),
    rotation: z.number().min(-180).max(180),
    shape: z.enum(['rect', 'rounded', 'circle', 'line']),
    assetId: z.string().max(100).optional(),
    fit: z.enum(['contain', 'cover']),
    binding: bindingSchema.optional(),
    data: z
      .array(
        z.object({
          name: z.string().max(1000),
          count: z.number().finite().min(0),
          score: z.number().optional(),
        }),
      )
      .max(100)
      .optional(),
    missing: z.boolean().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.x + e.w > SLIDE_WIDTH + 0.01 || e.y + e.h > SLIDE_HEIGHT + 0.01)
      ctx.addIssue({ code: 'custom', message: 'Komponen berada di luar slide.' });
    if (e.type === 'image' && !e.assetId)
      ctx.addIssue({ code: 'custom', message: 'Pilih gambar yang tersimpan di workspace.' });
    if (e.type === 'chart' && !['chart', 'timeline'].includes(e.binding?.kind ?? ''))
      ctx.addIssue({ code: 'custom', message: 'Grafik harus memiliki sumber pertanyaan.' });
  });
export const presentationInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    theme: z.enum(['professional', 'minimal', 'corporate']),
    version: z.number().int().min(1),
    slides: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          name: z.string().trim().min(1).max(150),
          background: hex,
          elements: z.array(slideElementSchema).max(80),
        }),
      )
      .min(1)
      .max(40),
  })
  .superRefine((doc, ctx) => {
    if (new Set(doc.slides.map((s) => s.id)).size !== doc.slides.length)
      ctx.addIssue({ code: 'custom', message: 'ID slide harus unik.' });
    const ids = doc.slides.flatMap((s) => s.elements.map((e) => e.id));
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'ID komponen harus unik.' });
  });
export function makeElement(
  id: string,
  type: SlideElement['type'],
  overrides: Partial<SlideElement> = {},
): SlideElement {
  return {
    id,
    type,
    x: 80,
    y: 180,
    w: 520,
    h: 90,
    text: type === 'text' ? 'Tulis cerita Anda' : '',
    fontSize: 32,
    fontFamily: 'Inter Variable',
    fontWeight: 500,
    align: 'left',
    lineHeight: 1.35,
    color: '#20203d',
    fill: '#eee8fb',
    stroke: '#7549df',
    strokeWidth: 0,
    opacity: 1,
    rotation: 0,
    shape: 'rounded',
    fit: 'contain',
    ...overrides,
  };
}
export function dataRevision(survey: Survey, rows: Submission[]) {
  return `${survey.version}:${rows.length}:${rows.reduce((sum, row) => sum + row.revision, 0)}:${rows.reduce((latest, row) => (row.submittedAt > latest ? row.submittedAt : latest), '')}`;
}
export function refreshPresentationData(
  document: PresentationDocument,
  survey: Survey,
  rows: Submission[],
  supplied?: SurveyInsights,
): PresentationDocument {
  const stats = supplied?.stats ?? calculateStats(survey, rows);
  const timeline = supplied?.timeline ?? responseTimeline(rows);
  return {
    ...document,
    sourceRevision: supplied?.sourceRevision ?? dataRevision(survey, rows),
    demo: survey.demo,
    slides: document.slides.map((slide) => ({
      ...slide,
      elements: slide.elements.map((element) => {
        const binding = element.binding;
        if (!binding) return element;
        if (binding.kind === 'metric') {
          const values = {
            total: String(stats.total),
            ikm: stats.ikm === null ? '—' : stats.ikm.toFixed(2),
            grade: stats.ikm === null ? '—' : stats.grade,
            completion: `${stats.completion}%`,
            category: stats.ikm === null ? '—' : stats.category,
            target: `Target ${survey.target.toLocaleString('id-ID')} responden`,
            summaryText: stats.total
              ? `${stats.total} respons terkumpul. Tinjau setiap distribusi jawaban sebelum menetapkan tindak lanjut.`
              : 'Belum ada respons. Kumpulkan jawaban sebelum menyusun kesimpulan.',
          };
          return {
            ...element,
            text: values[binding.key!],
            missing: binding.key === 'ikm' || binding.key === 'grade' ? stats.ikm === null : false,
          };
        }
        if (binding.kind === 'timeline')
          return { ...element, data: timeline.points, missing: !timeline.total };
        const question = survey.questions.find((q) => q.id === binding.questionId);
        return {
          ...element,
          data: question
            ? (supplied?.questions[question.id]?.distribution ??
              (question.options.length
                ? distribution(question, rows)
                : questionBreakdown(question, rows).rows))
            : [],
          missing: !question || !stats.total,
        };
      }),
    })),
  };
}
export type SlideSection = 'cover' | 'summary' | 'demographic' | 'ikm' | 'charts' | 'conclusion';
export function generateSlides(
  survey: Survey,
  rows: Submission[],
  theme: PresentationTheme,
  sections: SlideSection[],
  id: () => string,
): Slide[] {
  const palette = themes[theme];
  const text = (value: string, x: number, y: number, w: number, h: number, size = 32, weight = 500) =>
    makeElement(id(), 'text', {
      text: value,
      x,
      y,
      w,
      h,
      fontSize: size,
      fontWeight: weight,
      color: palette.ink,
    });
  const heading = (name: string) => [
    makeElement(id(), 'shape', { x: 64, y: 58, w: 10, h: 64, fill: palette.accent }),
    text(name, 96, 64, 1090, 110, name.length > 60 ? 30 : 40, 650),
  ];
  const slide = (name: string, elements: SlideElement[]): Slide => ({
    id: id(),
    name,
    background: palette.background,
    elements,
  });
  const metric = (key: DataBinding['key'], title: string, x: number) => [
    text(title, x, 230, 320, 48, 22),
    makeElement(id(), 'text', {
      x,
      y: 290,
      w: 320,
      h: 100,
      fontSize: 76,
      fontWeight: 650,
      color: palette.accent,
      binding: { kind: 'metric', key },
    }),
  ];
  const chart = (questionId: string, x = 90, y = 190, w = 1100, h = 400, chartType: DataChartType = 'bar') =>
    makeElement(id(), 'chart', {
      x,
      y,
      w,
      h,
      text: survey.questions.find((q) => q.id === questionId)?.label ?? 'Distribusi jawaban',
      fontSize: 22,
      color: palette.ink,
      fill: palette.accent,
      binding: { kind: 'chart', questionId, chartType },
    });
  const result: Slide[] = [];
  for (const section of sections) {
    if (section === 'cover')
      result.push(
        slide('Sampul', [
          makeElement(id(), 'shape', { x: 0, y: 0, w: 28, h: 720, fill: palette.accent }),
          text(survey.institution || 'SURVEYDASH STUDIO', 85, 100, 1090, 55, 22, 600),
          text(survey.title, 85, 230, 1090, 205, 58, 700),
          text(survey.demo ? 'Hasil survei · Data simulasi' : 'Hasil survei', 85, 545, 1050, 60, 25),
        ]),
      );
    if (section === 'summary')
      result.push(
        slide('Ringkasan', [
          ...heading('Ringkasan survei'),
          ...metric('total', 'Total responden', 96),
          ...metric('completion', 'Capaian target', 490),
          makeElement(id(), 'text', {
            x: 96,
            y: 475,
            w: 1000,
            h: 70,
            fontSize: 26,
            color: palette.ink,
            binding: { kind: 'metric', key: 'target' },
          }),
          text(survey.description, 96, 570, 1050, 85, 20),
        ]),
      );
    if (section === 'demographic') {
      const q =
        survey.questions.find(
          (q) =>
            q.chartVisible !== false &&
            ['gender', 'region', 'age', 'education', 'occupation'].includes(q.id) &&
            q.options.length,
        ) ?? survey.questions.find((q) => q.chartVisible !== false && q.type === 'choice' && !q.scored);
      result.push(
        slide('Profil responden', [
          ...heading('Profil responden'),
          ...(q
            ? [chart(q.id, 96, 195, 1080, 420, 'donut')]
            : [text('Belum ada pertanyaan profil yang dapat digrafikkan.', 96, 230, 1080, 120, 32)]),
        ]),
      );
    }
    if (section === 'ikm')
      result.push(
        slide('Indeks kepuasan', [
          ...heading('Indeks Kepuasan Masyarakat'),
          ...metric('ikm', 'Nilai IKM', 96),
          ...metric('grade', 'Mutu pelayanan', 600),
          makeElement(id(), 'text', {
            x: 96,
            y: 490,
            w: 1080,
            h: 60,
            fontSize: 30,
            color: palette.accent,
            binding: { kind: 'metric', key: 'category' },
          }),
          text(
            'IKM dihitung dari sembilan unsur pelayanan dengan jawaban yang valid.',
            96,
            570,
            1080,
            85,
            23,
          ),
        ]),
      );
    if (section === 'charts') {
      const available = survey.questions.filter((q) => q.options.length && q.chartVisible !== false);
      const candidates = available.slice(0, 30);
      result.push(
        slide('Tren respons', [
          ...heading('Tren pengumpulan respons'),
          makeElement(id(), 'chart', {
            x: 96,
            y: 210,
            w: 1080,
            h: 400,
            text: 'Jumlah respons dari waktu ke waktu · WIB',
            color: palette.ink,
            fill: palette.accent,
            binding: { kind: 'timeline', chartType: 'area' },
          }),
        ]),
      );
      if (!candidates.length)
        result.push(
          slide('Distribusi jawaban', [
            ...heading('Distribusi jawaban'),
            text('Belum ada pertanyaan pilihan yang diaktifkan untuk chart.', 96, 230, 1080, 120, 32),
          ]),
        );
      for (const question of candidates)
        result.push(
          slide(question.label.slice(0, 100), [
            ...heading(question.label),
            chart(
              question.id,
              90,
              195,
              1100,
              420,
              question.chartType ??
                (question.options.length < 5 ? 'donut' : question.scored ? 'column' : 'bar'),
            ),
          ]),
        );
      if (available.length > 30)
        result.push(
          slide('Grafik tambahan', [
            ...heading('Pertanyaan lain'),
            text(
              `30 dari ${available.length} pertanyaan pilihan dibuat otomatis. Tambahkan slide dan grafik untuk pertanyaan lainnya melalui editor.`,
              96,
              230,
              1080,
              180,
              30,
            ),
          ]),
        );
    }
    if (section === 'conclusion')
      result.push(
        slide('Kesimpulan', [
          ...heading('Kesimpulan dan tindak lanjut'),
          makeElement(id(), 'text', {
            x: 96,
            y: 200,
            w: 1080,
            h: 120,
            fontSize: 30,
            color: palette.ink,
            binding: { kind: 'metric', key: 'summaryText' },
          }),
          text(
            'Tambahkan rekomendasi berdasarkan hasil dan kebutuhan organisasi Anda.',
            96,
            390,
            1080,
            160,
            28,
          ),
        ]),
      );
  }
  return result.length ? result : [slide('Slide 1', [])];
}
