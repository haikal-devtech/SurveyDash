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
          'Pendaftaran surveyor meminta nama lengkap, username, provinsi, bank atau penyedia rekening, nama pemilik rekening, dan nomor rekening. Provinsi profil dipakai pada peta seluruh surveyor yang hanya dapat dibuka admin platform; data ini terpisah dari wilayah tugas tiap survei dan tidak tampil di form responden. Akun lama tanpa provinsi tetap dapat masuk dan dapat melengkapinya pada Profil. Nama lengkap boleh sama; username membedakan akun. Rekening untuk administrasi surveyor disimpan terenkripsi dan ditampilkan tersamarkan. Rekening tidak tampil di form responden, link pribadi, tabel jawaban, daftar penugasan pengelola, atau peta admin. Aplikasi belum menjalankan transfer atau verifikasi rekening.',
        ],
        [
          'Anggota dan undangan workspace',
          'Pemilik workspace dapat membuat link undangan Pengelola yang berlaku tujuh hari. Penerima yang memilih Bergabung mendapat peran Editor secara bawaan. Pemilik dapat mengubah peran menjadi Pembaca yang tidak dapat menulis data, atau Koordinator lapangan yang mengelola penugasan dan review kualitas tanpa akses pengelolaan umum. Anggota tidak mendapat hak admin platform atau akses rekening pribadi surveyor. Pemilik dapat melihat nama dan email anggota, mematikan link, atau mencabut akses anggota tanpa menghapus survei dan jawaban. Mematikan link tidak mencabut keanggotaan yang sudah aktif. Bagikan link hanya kepada rekan yang diberi kewenangan. Keanggotaan, perubahan peran, tindakan penting dan koreksi data menyimpan pelaku serta waktunya.',
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
          'Wilayah tugas surveyor',
          'Pengelola menetapkan provinsi tugas, target provinsi dan bila diperlukan catatan kabupaten/kota, kecamatan, koordinator serta target tugas. Respons baru menyimpan provinsi penugasan pada saat dikirim. Mengganti wilayah tugas tidak memindahkan snapshot respons yang sudah tercatat. Data lama tanpa snapshot dan link tanpa provinsi ditandai belum terpetakan. Angka peta mengikuti pilihan dataset mentah atau respons diterima pada survei; surveyor aktif tetap dihitung dari tugas saat ini. Aplikasi tidak meminta GPS untuk fitur ini, dan wilayah penugasan bukan domisili responden. Surveyor hanya melihat tugasnya serta jumlah respons dari link pribadinya per survei. Peta tidak dipublikasikan bersama form atau presentasi.',
        ],
        [
          'Undangan surveyor',
          'Pengelola dapat membagikan link undangan yang berlaku tujuh hari dan dapat dimatikan lebih awal. Penerima link dapat melihat judul survei dan instansinya, lalu mendaftar atau masuk sebagai Surveyor dan memilih Bergabung. Akun yang bergabung tercatat pada penugasan milik Pengelola. Link dapat diteruskan, sehingga Pengelola perlu membagikannya melalui pesan pribadi kepada orang yang dituju. Mematikan undangan menghentikan orang baru bergabung; penugasan yang sudah ada diatur secara terpisah.',
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
          'Cleaning membantu meninjau nama, jawaban, atau bank dan rekening yang sama bila pertanyaan terkait tersedia dan dipilih. Indeks kemiripan tersimpan privat pada survei. Kesamaan bukan bukti kecurangan. Pengelola menandai respons Diterima, Perlu verifikasi, atau Dikeluarkan dengan alasan dan audit. Dataset diterima hanya memakai keputusan Diterima pada revisi terbaru; dataset mentah tetap mencakup semua respons. Koreksi jawaban membuat review dan bobot lama perlu ditinjau ulang. Pembatasan surveyor dapat berlaku pada workspace atau seluruh platform melalui admin; tugas dan link dinonaktifkan, sedangkan respons lama tetap tersedia untuk review. Pengelola juga dapat mencatat honor; aplikasi tidak menjalankan transfer.',
        ],
        [
          'Form, presentasi, dan ekspor yang dibagikan',
          'Form dapat dipasang publik, link saja, atau privat. Pengelola dapat mengaktifkan link presentasi tanpa login setelah meninjau isi slide. Link menampilkan versi yang disetujui, termasuk angka agregat, teks manual, dan gambar, tanpa tabel jawaban atau akses editor. Link dapat dicabut dan otomatis dicabut saat presentasi diarsipkan atau survei dipindahkan ke sampah. Salinan atau ekspor yang sudah dimiliki penerima tidak dapat ditarik kembali. Ekspor dapat memuat jawaban dan atribusi surveyor; Pengelola perlu membatasi pembagiannya sesuai tujuan survei.',
        ],
        [
          'Draft, alur form dan waktu pengisian',
          'Form dapat memakai bagian dan pertanyaan bersyarat. Jawaban pertanyaan yang tersembunyi tidak ikut disimpan sebagai jawaban aktif. Draft dan kunci retry disimpan per tab untuk pemulihan setelah refresh. Penyimpanan yang bertahan setelah tab ditutup hanya dilakukan jika Anda memilih Simpan draft di perangkat ini; draft berlaku paling lama empat jam sejak disimpan. Saat ditemukan draft, Anda memilih melanjutkan atau memulai isian kosong. Hindari penyimpanan lintas tab pada perangkat bersama. Setelah kirim, jawaban draft dihapus dan tanda berhasil tersimpan per tab agar refresh tidak membuat pengisian ulang tanpa sengaja. Waktu mulai yang dilaporkan perangkat dan waktu penerimaan server dapat disimpan untuk membantu review kualitas; durasi tidak membuktikan identitas atau kecurangan.',
        ],
        [
          'Dataset final dan pembobotan',
          'Pengelola dapat memberi bobot manual dengan alasan dan membuat versi final setelah pengumpulan ditutup serta peninjauan dikonfirmasi. Versi final menyalin pertanyaan, jawaban, wilayah, atribusi, bobot dan catatan metode saat itu. Koreksi sumber tidak mengubah salinan yang dikunci. Salinan bersifat privat bagi pihak berwenang dan dapat diekspor. Dataset final ikut dihapus bila seluruh survei dihapus permanen; salinan ekspor dan backup mengikuti pengelolaan terpisah.',
        ],
        [
          'Verifikasi email dan authenticator',
          'Bila layanan email aktif, akun dapat menerima link verifikasi satu jam. Anda dapat menambahkan authenticator dua langkah dan menyimpan kode cadangan sendiri. Jangan membagikan QR, kunci authenticator, kode cadangan atau kata sandi kepada anggota workspace maupun support. Pengaturan keamanan mengikuti akun pribadi, terpisah dari workspace yang sedang dibuka.',
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
          'Jika sambungan Google diaktifkan dan Anda memberikan izin, aplikasi membaca pertanyaan serta, bila dipilih, jawaban lama dari form yang Anda pilih. Salinan termasuk waktu, email yang dikumpulkan form sumber, dan jawaban yang belum didukung disimpan privat untuk Pengelola Survei dan ekspornya. Berkas lampiran tetap di Google; nama dan ID berkas dapat tersimpan pada data asli. Form sumber tidak diubah. Pratinjau berisi data terenkripsi, berlaku 15 menit dan dibersihkan saat proses impor berikutnya. Setelah impor, data historis mengikuti retensi survei dan cadangannya. Token sambungan terenkripsi, terikat akun login, dan tidak dikirim ke browser. Memutuskan sambungan menghapus token lokal; survei dan jawaban yang telah diimpor tetap tersimpan. Izin Google dapat dicabut melalui pengaturan akun Google Anda.',
        ],
        [
          'Pemulihan akses melalui email',
          'Jika layanan email diaktifkan, permintaan pemulihan mengirim link ke alamat akun melalui penyedia email yang dikonfigurasi pengelola. Link berlaku 30 menit dan hanya dapat dipakai sekali. Setelah kata sandi diubah melalui link tersebut, sesi lama dicabut.',
        ],
        [
          'Retensi dan permintaan terkait data',
          'Arsip dan sampah menyimpan data agar dapat dipulihkan. Penghapusan otomatis tidak aktif. Pemilik menetapkan masa minimum di sampah antara 30 dan 3650 hari, bawaan 90 hari, lalu dapat meninjau penghapusan permanen setelah masa tersebut terlewati dengan konfirmasi nama survei, alasan dan kebutuhan cadangan. Ini menghapus respons, penugasan, presentasi, hasil review dan versi final survei terkait, tetapi tidak otomatis menghapus akun, profil surveyor, aset yang dipakai ulang atau salinan eksternal. Permintaan akses, koreksi, penghapusan atau penarikan persetujuan dapat diajukan dari akun atau melalui kontak support untuk pemohon tanpa akun. Operator memeriksa identitas, kewenangan dan data terkait; mengubah status permintaan saja tidak otomatis menjalankan penghapusan. Cadangan baru dapat memakai format streaming terenkripsi; bila workflow backup GitHub diaktifkan, artifact terenkripsi disimpan maksimal 90 hari dan pemulihan diuji pada lingkungan terisolasi. Penerapan jadwal serta penyedia backup bergantung konfigurasi operator. Catatan error operasional tanpa isi jawaban disimpan 14 hari.',
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
