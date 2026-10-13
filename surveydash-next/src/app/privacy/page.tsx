export const metadata = { title: 'Privasi — SurveyDash Studio', alternates: { canonical: '/privacy' } };
import { PublicArticle } from '@/components/public-article';
export default function PrivacyPage() {
  return (
    <PublicArticle
      title="Bagaimana data digunakan."
      intro="Informasi privasi versi beta ini menjelaskan perilaku aplikasi saat ini. Pengelola perlu menetapkan kebijakan operasional dan kontak privasi sebelum penggunaan organisasi secara luas."
      sections={[
        [
          'Data akun',
          'Nama tampilan, alamat email, hash kata sandi, dan sesi login disimpan untuk menyediakan akses workspace. Kata sandi tidak disimpan sebagai teks biasa.',
        ],
        [
          'Data survei',
          'Pertanyaan, pilihan, jawaban, riwayat koreksi, template, presentasi, dan gambar yang diunggah disimpan pada layanan database. Pemilik survei menentukan pertanyaan dan tujuan pengumpulan.',
        ],
        [
          'Akses dan pembagian',
          'Jawaban dan pengelolaan survei membutuhkan akun pemilik. Form dapat dipasang publik, link saja, atau privat. Ekspor oleh pemilik dapat memuat data survei dan harus dibagikan secara bertanggung jawab.',
        ],
        [
          'Penyimpanan dan penyedia layanan',
          'Aplikasi dihosting pada Vercel dan menggunakan PostgreSQL yang dikelola melalui Prisma Postgres. Font disediakan dari aplikasi. Tidak ada pelacak pemasaran yang dipasang oleh implementasi ini.',
        ],
        [
          'Cookie dan pembatasan permintaan',
          'Cookie sesi dipakai untuk login. Alamat jaringan dapat diproses pada pembatasan pengiriman; kunci pembatasan disimpan sebagai hash. Log aplikasi tidak sengaja mencetak jawaban responden atau rahasia sesi.',
        ],
        [
          'Retensi',
          'Arsip dan sampah menyimpan data agar dapat dipulihkan. Data tidak dihapus permanen secara otomatis oleh aplikasi. Cadangan yang dibuat pengelola dapat memuat salinan data.',
        ],
        [
          'Kontak',
          'Untuk informasi bantuan dan ketersediaan kontak pengelola, buka halaman Kontak. Jangan mempublikasikan data pribadi melalui laporan bug umum.',
        ],
      ]}
    />
  );
}
