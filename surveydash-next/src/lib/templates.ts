import type { Question, Survey, Widget } from './types';

const options = (labels: string[], scored = false) =>
  labels.map((label, i) => ({ id: `o${i + 1}`, label, ...(scored ? { score: i + 1 } : {}) }));
const field = (
  id: string,
  label: string,
  type: Question['type'],
  labels: string[] = [],
  scored = false,
): Question => ({
  id,
  label,
  description: '',
  type,
  required: true,
  scored,
  options: options(labels, scored),
});

export const skmQuestions: Question[] = [
  field('name', 'Nama responden', 'text'),
  field('gender', 'Jenis kelamin', 'choice', ['Laki-laki', 'Perempuan']),
  field('region', 'Kecamatan', 'choice', [
    'Serpong',
    'Serpong Utara',
    'Ciputat',
    'Ciputat Timur',
    'Pamulang',
    'Pondok Aren',
    'Setu',
  ]),
  field('service', 'Jenis layanan', 'choice', [
    'Penyelamatan',
    'Pemadaman',
    'Sosialisasi / Edukasi',
    'Rekomendasi teknis',
  ]),
  field(
    'u1',
    'Persyaratan pelayanan',
    'rating',
    ['Tidak sesuai', 'Kurang sesuai', 'Sesuai', 'Sangat sesuai'],
    true,
  ),
  field('u2', 'Kemudahan prosedur', 'rating', ['Tidak mudah', 'Kurang mudah', 'Mudah', 'Sangat mudah'], true),
  field(
    'u3',
    'Kecepatan pelayanan',
    'rating',
    ['Tidak cepat', 'Kurang cepat', 'Cepat', 'Sangat cepat'],
    true,
  ),
  field('u4', 'Biaya / tarif', 'rating', ['Sangat mahal', 'Cukup mahal', 'Murah', 'Gratis'], true),
  field(
    'u5',
    'Kesesuaian produk pelayanan',
    'rating',
    ['Tidak sesuai', 'Kurang sesuai', 'Sesuai', 'Sangat sesuai'],
    true,
  ),
  field(
    'u6',
    'Kompetensi petugas',
    'rating',
    ['Tidak kompeten', 'Kurang kompeten', 'Kompeten', 'Sangat kompeten'],
    true,
  ),
  field(
    'u7',
    'Perilaku petugas',
    'rating',
    ['Tidak sopan', 'Kurang sopan', 'Sopan dan ramah', 'Sangat sopan dan ramah'],
    true,
  ),
  field(
    'u8',
    'Penanganan pengaduan',
    'rating',
    ['Tidak ada', 'Kurang berfungsi', 'Berfungsi', 'Dikelola dengan baik'],
    true,
  ),
  field('u9', 'Sarana dan prasarana', 'rating', ['Buruk', 'Cukup', 'Baik', 'Sangat baik'], true),
  { ...field('feedback', 'Saran untuk pelayanan yang lebih baik', 'textarea'), required: false },
];

export const experienceQuestions: Question[] = [
  field('name', 'Nama responden', 'text'),
  field('channel', 'Dari mana Anda mengetahui layanan kami?', 'choice', [
    'Media sosial',
    'Teman / keluarga',
    'Website',
    'Lainnya',
  ]),
  field('satisfaction', 'Seberapa puas Anda dengan pengalaman ini?', 'rating', [
    'Tidak puas',
    'Kurang puas',
    'Puas',
    'Sangat puas',
  ]),
  field('priority', 'Apa yang perlu kami tingkatkan?', 'checkbox', [
    'Kecepatan',
    'Informasi',
    'Fasilitas',
    'Keramahan',
  ]),
  { ...field('feedback', 'Ceritakan pengalaman Anda', 'textarea'), required: false },
];

export const templateDefinitions = [
  {
    id: 'skm',
    name: 'Kepuasan masyarakat',
    description: '9 unsur pelayanan, demografi, dan perhitungan IKM.',
    kind: 'skm' as const,
    questions: skmQuestions,
  },
  {
    id: 'experience',
    name: 'Pengalaman layanan',
    description: 'Kepuasan, sumber informasi, dan masukan pelanggan.',
    kind: 'custom' as const,
    questions: experienceQuestions,
  },
  {
    id: 'customer',
    name: 'Kepuasan pelanggan',
    description: 'Pengalaman pelanggan, kepuasan, dan saran untuk bisnis.',
    kind: 'custom' as const,
    questions: experienceQuestions.map((q) => ({
      ...structuredClone(q),
      label: q.id === 'satisfaction' ? 'Seberapa puas Anda dengan produk atau layanan kami?' : q.label,
    })),
  },
  {
    id: 'blank',
    name: 'Mulai dari kosong',
    description: 'Susun pertanyaan sesuai kebutuhan penelitian Anda.',
    kind: 'custom' as const,
    questions: [field('name', 'Nama responden', 'text')],
  },
];

export function defaultWidgets(kind: Survey['kind']): Widget[] {
  return [
    { id: 'total', type: 'metric', title: 'Total responden', x: 0, y: 0, w: 4, h: 4 },
    ...(kind === 'skm'
      ? [
          {
            id: 'ikm',
            type: 'metric' as const,
            title: 'Indeks kepuasan masyarakat',
            content: 'ikm',
            x: 4,
            y: 0,
            w: 4,
            h: 4,
          },
        ]
      : []),
    {
      id: 'note',
      type: 'text',
      title: 'Tentang survei',
      content: 'Setiap jawaban membantu kita membangun pelayanan yang lebih baik.',
      x: kind === 'skm' ? 8 : 4,
      y: 0,
      w: kind === 'skm' ? 4 : 8,
      h: 4,
    },
    {
      id: 'chart-main',
      type: 'bar',
      title: kind === 'skm' ? 'Persyaratan pelayanan' : 'Kepuasan responden',
      questionId: kind === 'skm' ? 'u1' : 'satisfaction',
      x: 0,
      y: 4,
      w: 8,
      h: 7,
    },
    {
      id: 'chart-side',
      type: 'pie',
      title: kind === 'skm' ? 'Profil responden' : 'Sumber informasi',
      questionId: kind === 'skm' ? 'gender' : 'channel',
      x: 8,
      y: 4,
      w: 4,
      h: 7,
    },
  ];
}
