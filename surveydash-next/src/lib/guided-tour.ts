import type { GuideRole } from './guides';

export const TOUR_OPEN = 'surveydash:open-guide';
export const TOUR_CREATED = 'surveydash:survey-created';
export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  clickNext?: string;
  advanceOn?: string;
  slot?: string;
  waitForCreate?: boolean;
}
const selector = (name: string) => `[data-tour="${name}"]`;

export function tourPlan(role: GuideRole, hasTasks = false, canShare = false): TourStep[] {
  if (role === 'manager')
    return [
      {
        id: 'create',
        target: selector('create-survey'),
        title: 'Mulai dari tombol ini',
        description: 'Klik Buat survei untuk membuat survei atau SKM pertama Anda.',
        clickNext: 'create-survey',
        advanceOn: 'create-survey',
      },
      {
        id: 'name',
        target: selector('survey-name'),
        title: 'Beri nama survei',
        description: 'Isi nama survei di kotak ini. Setelah itu, pilih Next.',
        slot: 'name',
      },
      {
        id: 'template',
        target: selector('template-skm'),
        title: 'Pilih jenis survei',
        description: 'Klik SKM untuk 9 unsur pelayanan, atau pilih template lainnya.',
        slot: 'template',
        advanceOn: 'survey-template',
      },
      {
        id: 'submit',
        target: selector('survey-create-submit'),
        title: 'Buat draft survei Anda',
        description: 'Klik tombol Buat survei yang disorot. Draft ini bisa Anda ubah sebelum dibagikan.',
        slot: 'submit',
        waitForCreate: true,
      },
      {
        id: 'questions',
        target: selector('editor-tab-questions'),
        title: 'Atur pertanyaannya',
        description:
          'Di bagian Pertanyaan, Anda bisa menambah dan mengubah pertanyaan. Next membuka preview form.',
        clickNext: 'editor-tab-form',
        advanceOn: 'editor-tab-form',
      },
      {
        id: 'form',
        target: selector('form-actions'),
        title: 'Siapkan form responden',
        description:
          'Periksa form di bawah. Klik Buka form jika sudah siap, lalu salin link untuk responden. Next mengenalkan undangan Surveyor.',
        clickNext: 'editor-tab-surveyors',
        advanceOn: 'editor-tab-surveyors',
      },
      {
        id: 'invite',
        target: selector('manager-invitation'),
        title: 'Undang Surveyor dari sini',
        description:
          'Buat link undangan dan kirim kepada Surveyor. Setiap Surveyor akan mendapat link responden sendiri. Next membuka Data.',
        clickNext: 'editor-tab-data',
        advanceOn: 'editor-tab-data',
      },
      {
        id: 'data',
        target: selector('editor-tab-data'),
        title: 'Jawaban tersimpan di Data',
        description: 'Jawaban yang masuk tampil di bagian ini. Next membuka ringkasan hasilnya.',
        clickNext: 'editor-tab-analytics',
        advanceOn: 'editor-tab-analytics',
      },
      {
        id: 'analysis',
        target: selector('editor-tab-analytics'),
        title: 'Lihat hasil di Analisis',
        description:
          'Grafik dan hasil SKM muncul setelah ada jawaban. Selesai! Panduan bisa dibuka ulang lewat Bantuan.',
      },
    ];
  return [
    {
      id: 'tasks',
      target: selector('surveyor-tasks'),
      title: 'Tugas Anda ada di sini',
      description: hasTasks
        ? 'Ini survei yang ditugaskan kepada Anda. Next mengajak Anda membaca pertanyaannya.'
        : 'Belum ada tugas? Minta link undangan dari Pengelola, buka link itu, lalu pilih Bergabung.',
      ...(hasTasks ? { clickNext: 'surveyor-preview', advanceOn: 'surveyor-preview' } : {}),
    },
    ...(hasTasks
      ? [
          {
            id: 'preview',
            target: selector('surveyor-questions'),
            title: 'Baca pertanyaan survei',
            description:
              'Pertanyaan bisa dibaca di sini. Pengelola yang mengubah pertanyaannya. Next menutup preview ini.',
            slot: 'preview',
            clickNext: 'surveyor-close-preview',
          },
        ]
      : []),
    ...(canShare
      ? [
          {
            id: 'share',
            target: `${selector('surveyor-copy')}:not(:disabled)`,
            title: 'Salin link pribadi Anda',
            description:
              'Klik Salin link responden, lalu kirim link itu kepada responden. Nama Anda akan tercatat otomatis.',
          },
        ]
      : []),
    {
      id: 'progress',
      target: selector('surveyor-progress'),
      title: 'Pantau respons di sini',
      description:
        'Angka ini menunjukkan respons melalui link Anda. Gunakan Perbarui untuk mengambil jumlah terbaru.',
    },
    {
      id: 'profile',
      target: selector('surveyor-profile'),
      title: 'Profil dan rekening Anda',
      description:
        'Klik Profil untuk melihat identitas dan rekening Anda. Selesai! Buka Bantuan kapan saja untuk mengulang panduan.',
    },
  ];
}

export interface TourRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function placeTourCard(
  target: TourRect | null,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const gap = 12;
  const width = Math.min(size.width, Math.max(0, viewport.width - gap * 2));
  const height = Math.min(size.height, Math.max(0, viewport.height - gap * 2));
  const clamp = (value: number, max: number) => Math.max(gap, Math.min(value, Math.max(gap, max)));
  const left = clamp(
    target ? target.left + target.width / 2 - width / 2 : (viewport.width - width) / 2,
    viewport.width - width - gap,
  );
  const below = target ? target.top + target.height + gap : viewport.height - height - gap;
  const above = target ? target.top - height - gap : below;
  const placement = below + height <= viewport.height - gap ? 'below' : above >= gap ? 'above' : 'bottom';
  return {
    left,
    top: clamp(
      placement === 'below' ? below : placement === 'above' ? above : viewport.height - height - gap,
      viewport.height - height - gap,
    ),
    width,
    placement,
  };
}

export function tourAdvanceIndex(plan: TourStep[], current: number, action: string) {
  if (action === 'created' && ['name', 'template', 'submit'].includes(plan[current]?.id ?? '')) {
    const questions = plan.findIndex((step) => step.id === 'questions');
    return questions >= 0 ? questions : current;
  }
  if (plan[current]?.advanceOn === action) return Math.min(current + 1, plan.length - 1);
  return current;
}
export function tourClosedIndex(plan: TourStep[], current: number) {
  return plan[current]?.slot === 'preview' || ['name', 'template', 'submit'].includes(plan[current]?.id ?? '')
    ? 0
    : current;
}
export function tourBackIndex(plan: TourStep[], current: number) {
  return current <= 0 || plan[current]?.id === 'questions' ? current : current - 1;
}
