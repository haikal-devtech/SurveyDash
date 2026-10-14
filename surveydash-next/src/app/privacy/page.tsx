export const metadata = { title: 'Privasi — SurveyDash Studio', alternates: { canonical: '/privacy' } };
import { PublicArticle } from '@/components/public-article';
import { SUPPORT_EMAIL } from '@/lib/support';
export default function PrivacyPage() {
  return (
    <PublicArticle
      title="Bagaimana data digunakan."
      intro="Informasi privasi versi beta ini menjelaskan data yang diproses aplikasi dan cara menghubungi pengelola."
      sections={[
        [
          'Data akun',
          'Nama tampilan, alamat email, foto profil yang Anda unggah, hash kata sandi, dan sesi login disimpan untuk menyediakan akses workspace. Kata sandi tidak disimpan sebagai teks biasa. Foto profil disimpan sebagai gambar yang hanya dapat diakses melalui akun yang berwenang.',
        ],
        [
          'Data survei',
          'Pertanyaan, pilihan, jawaban, riwayat koreksi, template, presentasi, dan gambar yang diunggah disimpan pada layanan database. Pemilik survei menentukan pertanyaan dan tujuan pengumpulan.',
        ],
        [
          'Akses dan pembagian',
          'Jawaban dan pengelolaan survei membutuhkan akun pemilik atau admin platform yang diberi akses oleh pengelola. Admin dapat memilih workspace untuk membantu mengelola form, data, template dan presentasi; koreksi tetap mencatat akun yang melakukan perubahan. Form dapat dipasang publik, link saja, atau privat. Pemilik dapat mengaktifkan link presentasi tanpa login setelah meninjau isi slide. Link menampilkan versi yang disetujui, termasuk angka agregat, teks manual dan gambar, tanpa tabel jawaban atau akses editor. Link dapat dicabut dan otomatis dicabut saat presentasi diarsipkan atau survei dipindahkan ke sampah. Salinan yang sudah dimiliki penerima tidak dapat ditarik kembali. Ekspor oleh pemilik dapat memuat data survei dan harus dibagikan secara bertanggung jawab.',
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
          'Sambungan Google Forms',
          'Jika sambungan Google diaktifkan dan Anda memberikan izin, aplikasi membaca pertanyaan dari form yang Anda pilih melalui Google Forms API. Jawaban lama tidak diminta dan form sumber tidak diubah. Token sambungan disimpan terenkripsi, terikat pada akun login, dan tidak dikirim ke browser. Memutuskan sambungan menghapus token yang disimpan di SurveyDash. Izin pada akun Google dapat dikelola melalui pengaturan akun Google Anda.',
        ],
        [
          'Pemulihan akses melalui email',
          'Jika layanan email diaktifkan, permintaan pemulihan mengirim link ke alamat akun melalui penyedia email yang dikonfigurasi pengelola. Link berlaku 30 menit dan hanya dapat dipakai sekali. Setelah kata sandi diubah melalui link tersebut, sesi lama dicabut.',
        ],
        [
          'Retensi',
          'Arsip dan sampah menyimpan data agar dapat dipulihkan. Data tidak dihapus permanen secara otomatis oleh aplikasi. Cadangan yang dibuat pengelola dapat memuat salinan data.',
        ],
        [
          'Kontak',
          'Hubungi ' +
            SUPPORT_EMAIL +
            ' untuk bantuan dan permintaan terkait data, atau buka halaman Kontak. Jangan mempublikasikan data pribadi melalui laporan bug umum.',
        ],
      ]}
    />
  );
}
