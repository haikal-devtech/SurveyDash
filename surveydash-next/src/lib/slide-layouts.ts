import { makeElement, themes, type Slide, type PresentationTheme } from './presentation-model';
import type { Survey } from './types';
export const slideLayouts = [
  { id: 'cover', name: 'Sampul', description: 'Judul besar dan identitas survei' },
  { id: 'summary', name: 'Ringkasan', description: 'Angka utama dan tren respons' },
  { id: 'chart', name: 'Fokus chart', description: 'Satu grafik dengan ruang catatan' },
  { id: 'comparison', name: 'Dua chart', description: 'Dua distribusi berdampingan' },
  { id: 'section', name: 'Pembatas bagian', description: 'Judul bagian untuk alur presentasi' },
  { id: 'closing', name: 'Penutup', description: 'Ringkasan dan langkah selanjutnya' },
] as const;
export type SlideLayoutId = (typeof slideLayouts)[number]['id'];
export function createSlideLayout(
  layout: SlideLayoutId,
  survey: Survey,
  theme: PresentationTheme,
  id: () => string,
): Slide {
  const p = themes[theme];
  const text = (value: string, x: number, y: number, w: number, h: number, size = 28, extra = {}) =>
    makeElement(id(), 'text', { text: value, x, y, w, h, fontSize: size, color: p.ink, ...extra });
  const shape = (x: number, y: number, w: number, h: number, fill = p.accent) =>
    makeElement(id(), 'shape', { x, y, w: Math.max(10, w), h: Math.max(4, h), fill, shape: 'rect' });
  const heading = (title: string) => [
    text('SURVEYDASH / HASIL SURVEI', 64, 40, 900, 32, 16, { color: p.muted }),
    text(title, 64, 94, 1150, 75, 42, { fontWeight: 700 }),
    shape(64, 184, 1150, 2, '#e6e3eb'),
  ];
  const sources = survey.questions.filter((q) => q.options.length && q.chartVisible !== false);
  const chart = (index: number, x: number, y: number, w: number, h: number) => {
    const q = sources[index];
    return makeElement(id(), 'chart', {
      x,
      y,
      w,
      h,
      text: q?.label ?? 'Tren respons',
      color: p.ink,
      fill: p.accent,
      fontSize: 22,
      binding: q
        ? { kind: 'chart', questionId: q.id, chartType: q.chartType ?? (index ? 'donut' : 'column') }
        : { kind: 'timeline', chartType: 'area' },
    });
  };
  const footer = text(survey.institution || 'SurveyDash Studio', 64, 669, 1150, 24, 14, { color: p.muted });
  let elements;
  if (layout === 'cover')
    elements = [
      shape(0, 0, 18, 720),
      shape(64, 58, 50, 6),
      text(survey.institution || 'SURVEYDASH STUDIO', 64, 98, 1070, 48, 20, { color: p.muted }),
      text(survey.title, 64, 229, 1110, 235, 60, { fontWeight: 750 }),
      text('Laporan hasil survei', 64, 555, 1000, 45, 26, { color: p.accent }),
      footer,
    ];
  else if (layout === 'section')
    elements = [
      shape(0, 0, 1280, 720),
      text('BAGIAN BERIKUTNYA', 80, 95, 1080, 38, 20, { color: '#ffffff' }),
      text('Tulis judul bagian', 80, 260, 1080, 190, 66, { color: '#ffffff', fontWeight: 700 }),
      text(survey.title, 80, 611, 1080, 48, 22, { color: '#ffffff' }),
    ];
  else if (layout === 'summary')
    elements = [
      ...heading('Ringkasan survei'),
      text('Respons terkumpul', 64, 230, 300, 44, 22, { color: p.muted }),
      text('', 64, 282, 300, 100, 76, {
        color: p.accent,
        fontWeight: 700,
        binding: { kind: 'metric', key: 'total' },
      }),
      text('Capaian target', 64, 430, 300, 44, 22, { color: p.muted }),
      text('', 64, 485, 300, 100, 66, { fontWeight: 700, binding: { kind: 'metric', key: 'completion' } }),
      makeElement(id(), 'chart', {
        x: 440,
        y: 230,
        w: 760,
        h: 370,
        text: 'Tren respons',
        color: p.ink,
        fill: p.accent,
        binding: { kind: 'timeline', chartType: 'area' },
      }),
      footer,
    ];
  else if (layout === 'comparison')
    elements = [
      ...heading('Distribusi jawaban'),
      chart(0, 64, 225, 550, 380),
      chart(1, 666, 225, 550, 380),
      footer,
    ];
  else if (layout === 'closing')
    elements = [
      ...heading('Kesimpulan & tindak lanjut'),
      text('', 64, 235, 1080, 140, 32, { binding: { kind: 'metric', key: 'summaryText' } }),
      text('Tulis temuan utama dan langkah berikutnya setelah meninjau data.', 64, 430, 1080, 130, 30, {
        color: p.muted,
      }),
      footer,
    ];
  else
    elements = [
      ...heading('Hasil per pertanyaan'),
      chart(0, 64, 226, 800, 380),
      shape(916, 234, 3, 345, '#e6e3eb'),
      text('CATATAN', 954, 238, 255, 40, 18, { color: p.accent, fontWeight: 700 }),
      text('Tulis temuan dari grafik di samping.', 954, 304, 255, 245, 25, { color: p.muted }),
      footer,
    ];
  return {
    id: id(),
    name: slideLayouts.find((item) => item.id === layout)!.name,
    background: p.background,
    elements,
  };
}
