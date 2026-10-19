export type GuideRole = 'manager' | 'surveyor';
export const GUIDE_VERSION = 1;
export const guideSteps = {
  manager: [
    {
      title: 'Buat survei pertama',
      description:
        'Klik Buat survei. Pilih template SKM atau mulai dari survei kosong, lalu atur pertanyaannya.',
      image: 'create',
      tip: 'Template SKM sudah berisi 9 unsur pelayanan.',
    },
    {
      title: 'Buka survei, undang Surveyor',
      description:
        'Di tab Form, buka survei agar bisa diisi. Masuk ke menu Surveyor, pilih surveinya, lalu salin link undangan.',
      image: 'invite',
      tip: 'Surveyor bergabung lewat undangan dan mendapat link responden sendiri.',
    },
    {
      title: 'Pantau jawaban yang masuk',
      description:
        'Buka survei Anda. Tab Data berisi jawaban, tab Analisis menampilkan hasil, dan Cleaning data membantu meninjau respons mencurigakan.',
      image: 'results',
      tip: 'Responden cukup membuka link dan mengisi. Tanpa akun.',
    },
  ],
  surveyor: [
    {
      title: 'Terima tugas survei',
      description:
        'Buka link undangan dari Pengelola, lalu pilih Bergabung. Tugas akan muncul di halaman Tugas survei.',
      image: 'join',
      tip: 'Belum ada tugas? Minta link undangan kepada Pengelola.',
    },
    {
      title: 'Bagikan link Anda',
      description:
        'Pilih Lihat pertanyaan untuk membaca survei. Klik Salin link responden, lalu kirim link itu kepada responden.',
      image: 'share',
      tip: 'Gunakan link dari kartu tugas agar respons tercatat atas nama Anda.',
    },
    {
      title: 'Lihat perkembangannya',
      description: 'Jumlah respons muncul pada setiap tugas. Klik Perbarui untuk melihat jumlah terbaru.',
      image: 'progress',
      tip: 'Responden langsung mengisi tanpa login. Nama Anda tampil di form.',
    },
  ],
} as const;
