export const metadata = { title: 'Ketentuan — SurveyDash Studio', alternates: { canonical: '/terms' } };
import { PublicArticle } from '@/components/public-article';
export default function TermsPage() {
  return (
    <PublicArticle
      title="Gunakan workspace dengan bertanggung jawab."
      intro="Ketentuan penggunaan beta ini adalah informasi penggunaan versi pengujian. Ketentuan komersial belum berlaku karena pembayaran dan paket berbayar belum dibuka."
      sections={[
        [
          'Akun',
          'Gunakan akun yang Anda kendalikan dan jaga kerahasiaan kredensial. Pengelolaan survei dan data dibatasi kepada pemilik akun.',
        ],
        [
          'Survei dan responden',
          'Pemilik survei bertanggung jawab atas pertanyaan, pemberitahuan, izin pengumpulan, serta penggunaan jawaban. Jangan menggunakan survei untuk menyamar, mengumpulkan kredensial, atau menyebarkan konten yang melanggar hak orang lain.',
        ],
        [
          'Hasil dan data simulasi',
          'Grafik dihitung dari jawaban tersimpan. Contoh simulasi diberi label dan bukan hasil penelitian resmi. Pemilik perlu memeriksa kesesuaian instrumen dan kesimpulan sebelum membagikan laporan.',
        ],
        [
          'Versi pengujian',
          'Fitur dan antarmuka dapat berubah. Simpan ekspor dan cadangan yang diperlukan. Pembayaran dan undangan tim belum diaktifkan. Pemulihan lewat email dan sambungan Google Forms hanya tersedia setelah layanan tersebut dikonfigurasi dan diaktifkan pengelola.',
        ],
        [
          'Biaya',
          'Free Plan tersedia untuk pengujian. Tidak ada checkout atau transaksi berbayar yang diproses. Harga atau paket berbayar akan memerlukan pemberitahuan dan konfigurasi terpisah.',
        ],
      ]}
    />
  );
}
