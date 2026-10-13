export const metadata = { title: 'Bantuan — SurveyDash Studio', alternates: { canonical: '/help' } };
import Link from 'next/link';
import { PublicArticle } from '@/components/public-article';
export default function HelpPage() {
  return (
    <PublicArticle
      title="Panduan singkat."
      intro="Mulai dari form, lalu lanjutkan sampai presentasi."
      sections={[
        [
          'Membuat dan membagikan form',
          'Masuk ke workspace, pilih Survei kosong atau template, atur pertanyaan, lalu buka tab Form. Buka form dan salin link untuk responden.',
        ],
        [
          'Mengelola jawaban',
          'Buka tab Data dan muat ulang respons. Gunakan pencarian, pengurutan, pilihan kolom, dan CSV. Aktifkan koreksi data untuk mengubah jawaban; riwayat menyimpan nilai sebelum dan sesudah.',
        ],
        [
          'Membuat template',
          'Klik Simpan template dari editor, pilih Form, Presentasi, atau Paket survei. Template tersimpan di menu Template.',
        ],
        [
          'Menyusun presentasi',
          'Buka tab Presentasi. Gunakan kanvas grafik atau buat dokumen slide. Pilih komponen, atur teks dan gaya, lalu buka mode presentasi atau ekspor.',
        ],
        [
          'Memulihkan survei',
          'Buka Semua survei. Pilih Diarsipkan atau Sampah, lalu gunakan tindakan pemulihan. Survei yang dipulihkan kembali sebagai draft.',
        ],
        [
          'Akun dan pemulihan',
          'Pengaturan akun dapat mengubah nama tampilan. Pemulihan kata sandi melalui email belum diaktifkan; simpan kredensial Anda dengan aman.',
        ],
      ]}
    >
      <Link href="/contact" className="text-link">
        Informasi kontak
      </Link>
    </PublicArticle>
  );
}
