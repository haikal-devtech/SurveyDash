export const metadata = { title: 'Privasi — SurveyDash Studio', alternates: { canonical: '/privacy' } };
import { PublicArticle } from '@/components/public-article';
import { SUPPORT_EMAIL } from '@/lib/support';

export default function PrivacyPage() {
  return (
    <PublicArticle
      title="Kebijakan privasi SurveyDash Studio."
      intro="Pemberitahuan ini menjelaskan data akun, penugasan surveyor, asal link jawaban, dan penggunaan data survei pada versi beta. Baca juga keterangan tujuan pada survei yang Anda isi."
      sections={[
        [
          'Data akun dan tujuan penggunaannya',
          'Nama tampilan, alamat email, foto profil yang diunggah, hash kata sandi, dan sesi login disimpan untuk menyediakan dan mengamankan akses akun. Kata sandi tidak disimpan sebagai teks biasa. Foto profil hanya dapat diakses melalui akun yang berwenang. Pengelola Survei membuat pertanyaan dan mengelola hasil; surveyor membantu menyebarkan survei yang ditugaskan.',
        ],
        [
          'Profil surveyor dan rekening pribadi',
          'Untuk melengkapi profil surveyor, aplikasi meminta nama lengkap, username unik, bank atau penyedia rekening, nama pemilik rekening, dan nomor rekening. Nama lengkap boleh sama dengan orang lain; username membedakan akun. Rekening dicatat untuk administrasi surveyor dan kebutuhan pembayaran di luar aplikasi bila ada kesepakatan terpisah. Isian rekening disimpan terenkripsi, dan nomor ditampilkan tersamarkan pada profil. Rekening tidak ditampilkan di form responden, link pribadi, tabel jawaban, atau daftar penugasan Pengelola Survei. Aplikasi belum menjalankan transfer atau verifikasi rekening.',
        ],
        [
          'Persetujuan profil surveyor',
          'Sebelum menyimpan profil surveyor, Anda diminta menyetujui penggunaan data profil dan rekening untuk tujuan yang dijelaskan serta penampilan nama dan username pada link survei. Aplikasi mencatat persetujuan beserta waktu dan versi pemberitahuannya. Jika Anda tidak ingin melanjutkan atau ingin menarik persetujuan, hubungi kontak data di bawah untuk peninjauan dan penonaktifan profil; proses ini ditangani secara manual.',
        ],
        [
          'Nama surveyor dan asal link jawaban',
          'Link pribadi menghubungkan satu surveyor dengan satu survei yang ditugaskan. Nama dan username surveyor dapat terlihat oleh siapa pun yang menerima link dan ditampilkan pada form agar responden mengetahui asal link. Saat jawaban dikirim, server memeriksa link dan mencatat atribusi surveyor bersama jawaban. Responden tidak perlu mengetik nama surveyor. Link dapat diteruskan oleh penerima; atribusi menunjukkan asal link yang digunakan, bukan bukti identitas responden atau bukti siapa yang mengirim pesan terakhir.',
        ],
        [
          'Akses surveyor dan Pengelola Survei',
          'Surveyor hanya dapat membuka penugasan miliknya, membaca pertanyaan, dan membagikan link pribadinya. Penugasan tidak memberikan akses mengubah pertanyaan, melihat tabel jawaban responden, atau mengoreksi jawaban. Pengelola mengatur penugasan serta melihat jawaban dan atribusi di survei miliknya. Admin platform dapat mengakses workspace sesuai kewenangan dukungan; koreksi data mencatat akun pelakunya. Akses pengelolaan workspace tidak otomatis membuka rekening pribadi surveyor.',
        ],
        [
          'Pertanyaan dan jawaban responden',
          'Pertanyaan, pilihan, jawaban, waktu pengiriman, atribusi surveyor jika memakai link pribadi, riwayat koreksi, template, presentasi, dan gambar yang diunggah disimpan pada layanan database. Pengelola Survei menentukan tujuan dan isi pertanyaan. Rekening responden tidak diminta oleh pendaftaran surveyor; informasi tersebut hanya dikumpulkan jika Pengelola secara khusus menambahkannya sebagai pertanyaan dalam survei. Perhatikan pemberitahuan form sebelum mengirim jawaban.',
        ],
        [
          'Peninjauan data yang mungkin berulang',
          'Fitur cleaning membantu Pengelola meninjau kemiripan di dalam survei miliknya, misalnya nama sama, jawaban sama, atau nomor rekening sama bila pertanyaan rekening memang tersedia dan dipilih untuk pemeriksaan. Hasil adalah tanda untuk ditinjau manusia, bukan keputusan bahwa seseorang berbuat curang. Nama yang sama dapat dimiliki orang berbeda. Tanda tidak otomatis menghapus jawaban atau mengeluarkannya dari hasil; keputusan dan catatan peninjauan dicatat terpisah.',
        ],
        [
          'Form, presentasi, dan ekspor yang dibagikan',
          'Form dapat dipasang publik, link saja, atau privat. Pengelola dapat mengaktifkan link presentasi tanpa login setelah meninjau isi slide. Link menampilkan versi yang disetujui, termasuk angka agregat, teks manual, dan gambar, tanpa tabel jawaban atau akses editor. Link dapat dicabut dan otomatis dicabut saat presentasi diarsipkan atau survei dipindahkan ke sampah. Salinan atau ekspor yang sudah dimiliki penerima tidak dapat ditarik kembali. Ekspor dapat memuat jawaban dan atribusi surveyor; Pengelola perlu membatasi pembagiannya sesuai tujuan survei.',
        ],
        [
          'Penyimpanan dan penyedia layanan',
          'Aplikasi dihosting pada Vercel dan menggunakan PostgreSQL yang dikelola melalui Prisma Postgres. Font disediakan dari aplikasi. Tidak ada pelacak pemasaran yang dipasang oleh implementasi ini. Rekening terenkripsi tetap membutuhkan perlindungan terhadap akses database, cadangan, dan kunci aplikasi oleh operator.',
        ],
        [
          'Cookie dan pembatasan permintaan',
          'Cookie sesi dipakai untuk login. Alamat jaringan dapat diproses pada pembatasan pengiriman; kunci pembatasan disimpan sebagai hash. Log aplikasi tidak sengaja mencetak jawaban responden atau rahasia sesi. Nama atau username pada link dapat terlihat di riwayat browser atau oleh penerima link; hindari menaruh informasi rekening pada username atau pesan publik.',
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
          'Retensi dan permintaan terkait data',
          'Arsip dan sampah menyimpan data agar dapat dipulihkan. Profil surveyor, atribusi, dan catatan peninjauan tidak memiliki penghapusan otomatis pada versi ini. Cadangan dapat memuat salinan data. Permintaan akses, koreksi, penonaktifan, penarikan persetujuan, atau penghapusan ditangani operator secara manual setelah memeriksa kewenangan pemohon dan keterkaitannya dengan survei. Batas penanganan data historis dan cadangan akan dijelaskan saat permintaan ditinjau; aplikasi belum menyediakan penghapusan mandiri menyeluruh.',
        ],
        [
          'Kontak privasi dan bantuan',
          'Hubungi ' +
            SUPPORT_EMAIL +
            ' untuk bantuan akun atau permintaan terkait data. Sertakan email akun atau link survei yang relevan agar permintaan dapat ditelusuri. Jangan mengirim kata sandi atau nomor rekening lengkap melalui laporan bug umum. Untuk tujuan pertanyaan atau penggunaan jawaban suatu survei, hubungi juga Pengelola Survei yang mengumpulkannya.',
        ],
      ]}
    />
  );
}
