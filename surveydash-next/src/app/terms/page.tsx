export const metadata = { title: 'Ketentuan — SurveyDash Studio', alternates: { canonical: '/terms' } };
import { PublicArticle } from '@/components/public-article';

export default function TermsPage() {
  return (
    <PublicArticle
      title="Gunakan SurveyDash dengan bertanggung jawab."
      intro="Ketentuan ini berlaku untuk Pengelola Survei, surveyor, dan responden."
      sections={[
        [
          'Akun dan identitas tampilan',
          'Gunakan akun yang Anda kendalikan dan jaga kerahasiaan kredensial. Gunakan informasi profil yang sesuai. Nama lengkap boleh sama, sedangkan username surveyor harus unik. Jangan menyamar sebagai orang atau organisasi lain atau menaruh informasi rekening pada username publik.',
        ],
        [
          'Tanggung jawab Pengelola Survei',
          'Pengelola menyusun pertanyaan, menentukan tujuan pengumpulan, memberikan pemberitahuan kepada responden, dan menugaskan surveyor. Pengelola bertanggung jawab atas kebutuhan data yang diminta dan pembagian hasilnya. Jangan menggunakan survei untuk mengumpulkan kredensial, menyamar, atau menyebarkan konten yang melanggar hak orang lain. Hanya minta informasi rekening responden bila relevan dan dijelaskan pada survei.',
        ],
        [
          'Akses dan tugas surveyor',
          'Surveyor melengkapi profil dan menerima penugasan dari Pengelola. Akses tugas terbatas untuk membaca pertanyaan dan membagikan link pribadi; tidak memberikan izin mengubah pertanyaan, melihat tabel jawaban responden, atau mengoreksi jawaban. Gunakan link sesuai tugas dan jangan menjanjikan insentif atas nama Pengelola tanpa kesepakatan yang jelas.',
        ],
        [
          'Link pribadi dan atribusi',
          'Nama serta username surveyor terlihat pada form melalui link pribadi. Atribusi disimpan dari link yang diterima server saat jawaban dikirim. Link dapat diteruskan; atribusi bukan bukti identitas responden atau jaminan bahwa surveyor tertentu berbicara langsung dengannya. Pengelola perlu mempertimbangkan keterbatasan ini saat meninjau hasil.',
        ],
        [
          'Rekening dan insentif',
          'Pencatatan rekening surveyor digunakan untuk administrasi dan tidak mengaktifkan pembayaran otomatis. Aplikasi belum memverifikasi bank, nomor rekening, atau kepemilikannya dan belum memproses transfer. Syarat tugas, insentif, dan pembayaran di luar aplikasi perlu disepakati secara terpisah oleh pihak yang terlibat.',
        ],
        [
          'Peninjauan dan hasil survei',
          'Tanda kemiripan data membantu peninjauan manusia. Nama, rekening, atau pola jawaban yang sama belum membuktikan penyalahgunaan. Tanda tidak otomatis menghapus atau mengecualikan jawaban dari perhitungan. Pengelola bertanggung jawab meninjau konteks dan mencatat keputusan. Grafik dihitung dari jawaban tersimpan. Data simulasi diberi label dan bukan hasil penelitian resmi; periksa instrumen dan kesimpulan sebelum membagikan laporan.',
        ],
        [
          'Versi pengujian dan layanan tambahan',
          'Fitur dan antarmuka dapat berubah. Simpan ekspor dan cadangan yang diperlukan dengan akses terbatas. Kolaborasi Pengelola tersedia melalui undangan pemilik workspace. Penugasan surveyor tersedia sebagai akses terpisah. Pemulihan lewat email dan sambungan Google Forms hanya tersedia setelah layanan tersebut dikonfigurasi dan diaktifkan pengelola aplikasi.',
        ],
        [
          'Biaya dan privasi',
          'SurveyDash saat ini dapat digunakan tanpa langganan. Tidak ada transaksi berbayar yang diproses aplikasi. Penggunaan data akun, profil surveyor, dan jawaban dijelaskan pada Kebijakan Privasi; baca pemberitahuan tersebut sebelum melengkapi profil atau mengirim jawaban.',
        ],
      ]}
    />
  );
}
