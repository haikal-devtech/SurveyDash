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
          'Membagikan dan memulihkan presentasi',
          'Di editor slide, klik Bagikan dan tinjau isi sebelum mengaktifkan link viewer tanpa login. Perubahan editor tampil setelah Perbarui versi berbagi. Cabut link kapan saja. Dokumen arsip dapat dipulihkan melalui tab Arsip pada Studio presentasi; pemulihan tidak mengaktifkan link lama.',
        ],
        [
          'Memulihkan survei',
          'Buka Semua survei. Pilih Diarsipkan atau Sampah, lalu gunakan tindakan pemulihan. Survei yang dipulihkan kembali sebagai draft.',
        ],
        [
          'Akun dan pemulihan',
          'Pengaturan akun dapat mengubah nama tampilan dan foto profil. Jika pemulihan email tersedia, pilih Lupa kata sandi pada halaman login. Link berlaku 30 menit. Jika layanan belum aktif, hubungi pengelola melalui halaman Kontak.',
        ],
        [
          'Mengimpor Google Forms',
          'Jika sambungan Google tersedia, buka Impor Google Forms, sambungkan akun, lalu masukkan link editor atau ID form. Tinjau pertanyaan dan catatan item yang tidak didukung sebelum membuat salinan. Impor JSON tetap tersedia. Form sumber dan jawaban lama di Google tidak diubah.',
        ],
      ]}
    >
      <Link href="/contact" className="text-link">
        Informasi kontak
      </Link>
    </PublicArticle>
  );
}
