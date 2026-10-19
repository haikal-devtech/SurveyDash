# Surveyor: penggunaan data dan batas operasional

Pemberitahuan publik berada di `/privacy` dan ketentuan di `/terms`. Dokumen ini mencatat tujuan serta batas implementasi, bukan pernyataan sertifikasi kepatuhan hukum. Perubahan tujuan atau akses perlu disertai pembaruan pemberitahuan dan versi persetujuan yang sesuai.

## Data dan tujuan

| Data                                                 | Tujuan                                                                                       | Akses dalam aplikasi                                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email, hash kata sandi, sesi                         | Login dan pengamanan akun                                                                    | Akun sendiri dan layanan autentikasi; email tidak perlu dimuat dalam link publik                                                                  |
| Nama lengkap dan username unik                       | Membedakan surveyor, menemukan akun untuk penugasan, dan memberi konteks pada responden      | Surveyor sendiri, Pengelola yang menugaskan, serta penerima link pribadi                                                                          |
| Bank/penyedia, nama pemilik, nomor rekening surveyor | Administrasi rekening untuk pembayaran di luar aplikasi bila ada kesepakatan terpisah        | Tersimpan terenkripsi; profil sendiri menampilkan nomor tersamarkan; tidak dimuat pada form publik, data jawaban, atau daftar penugasan Pengelola |
| Persetujuan profil                                   | Mencatat penerimaan tujuan penggunaan rekening dan nama publik                               | Catatan internal terkait akun, versi pemberitahuan, dan waktu persetujuan                                                                         |
| Penugasan dan pengenal link                          | Membatasi survei yang dibaca surveyor serta menghubungkan jawaban dengan link yang digunakan | Surveyor hanya penugasan miliknya; Pengelola hanya survei di workspace berwenang                                                                  |
| Atribusi pada jawaban                                | Menunjukkan asal link ketika jawaban dikirim                                                 | Pengelola yang berwenang mengakses hasil; surveyor tidak memperoleh tabel responden                                                               |
| Tanda kemiripan dan keputusan peninjauan             | Membantu pemeriksaan kualitas di dalam satu survei                                           | Pengelola survei dan admin platform sesuai kewenangan workspace                                                                                   |

Nama lengkap tidak unik karena orang berbeda dapat memiliki nama yang sama. Username surveyor dinormalisasi dan unik secara global. Nama/username yang dapat dilihat publik sebaiknya tidak memuat nomor rekening atau data rahasia.

Pencatatan rekening belum menjalankan transfer, pengecekan bank, verifikasi kepemilikan, atau menjamin insentif. Aplikasi tidak mengirim rekening kepada penyedia pembayaran. Pemberian akses admin platform terhadap rekening penuh hanya boleh disebut dalam pemberitahuan bila endpoint berwenang tersebut benar-benar tersedia dan telah diverifikasi; akses workspace tidak dengan sendirinya membuka data ini.

## Penugasan, link, dan responden

Pengelola menugaskan surveyor ke survei miliknya. Surveyor dapat membaca pertanyaan serta menyalin link pribadi, tanpa mengubah pertanyaan atau membuka jawaban responden. Server harus memeriksa kepemilikan penugasan pada setiap endpoint; menyembunyikan tombol saja tidak cukup.

Link pribadi menampilkan identitas tampilan surveyor kepada responden. Server memvalidasi link dan menyimpan atribusi pada saat pengiriman jawaban. Jangan menerima `surveyorId` bebas dari body sebagai sumber kebenaran. Link yang sudah dicabut atau penugasan yang tidak lagi aktif harus mengikuti kebijakan validasi server yang terdokumentasi dalam implementasi.

Link dapat diteruskan oleh penerima. Atribusi adalah asal link, bukan bukti identitas responden, kontak langsung, atau keberhasilan kerja surveyor. Pengelola perlu mempertimbangkan hal ini sebelum mengambil keputusan terkait kualitas atau insentif. Jangan menjadikan nama surveyor pada link sebagai autentikasi atau izin editor.

Undangan untuk bergabung terpisah dari link responden. Pengelola dapat membuat link undangan berlaku tujuh hari, membagikannya melalui pesan pribadi, dan mematikannya. Pemegang link melihat judul/instansi, lalu memakai akun Surveyor lengkap untuk bergabung dan tercatat pada daftar penugasan. Link dapat dipakai beberapa calon surveyor dan dapat diteruskan. Mematikan undangan mencegah orang baru bergabung, tanpa menghapus penugasan yang sudah ada. Penugasan yang dinonaktifkan tidak dapat dipulihkan oleh surveyor melalui undangan lama maupun baru. Token undangan dilindungi sebagai kemampuan akses dan tidak boleh dipublikasikan di laporan atau fixture umum.

Rekening responden hanya diproses jika Pengelola secara khusus menambahkannya sebagai pertanyaan. Tidak ada kewajiban rekening bagi seluruh responden dan tidak ada pencocokan jawaban terhadap rekening profil surveyor. Form perlu menampilkan tujuan survei, siapa yang mengelola, atribusi bila ada, serta tautan privasi sebelum jawaban dikirim. Pengelola perlu menjelaskan kebutuhan pertanyaan rekening dalam konteks surveinya sendiri.

## Persetujuan dan permintaan data

Onboarding surveyor memerlukan persetujuan aktif yang tidak dicentang sebelumnya sebelum penyimpanan profil. Beri keterangan tujuan rekening, bahwa nama/username tampil di link, serta tautan `/privacy` dan `/terms`. Simpan catatan versi dan waktu persetujuan bersama akun. Persetujuan tidak boleh diperlakukan sebagai verifikasi bank atau persetujuan otomatis untuk tujuan baru.

Kontak yang disetujui operator untuk bantuan dan permintaan data adalah **help@surveydash.id**. Permintaan akses, koreksi, penonaktifan, penarikan persetujuan, atau penghapusan ditangani manual. Operator harus memeriksa kewenangan pemohon dengan akun terkait dan menjelaskan hasil serta batas penanganan. Jangan meminta kata sandi melalui email; hindari meminta nomor rekening lengkap melalui laporan bug publik.

Penarikan persetujuan belum merupakan fitur penghapusan mandiri menyeluruh. Operator perlu menonaktifkan profil atau akses yang relevan, meninjau link aktif dan atribusi historis, lalu menjelaskan bagian data yang ditangani dan salinan cadangan yang masih tersedia. Jangan menjanjikan penghapusan seketika atau menetapkan masa retensi yang belum diimplementasikan.

## Cleaning: tanda untuk ditinjau manusia

Pemeriksaan hanya boleh membandingkan jawaban dalam survei pemilik yang sama. Kemiripan nama, nomor rekening yang memang ditanyakan dan dipilih untuk pemeriksaan, atau jawaban identik dapat menghasilkan kandidat. Nama sama bukan bukti pelanggaran. Pengisian sah oleh anggota keluarga, nama yang umum, rekening bersama, atau pertanyaan dengan pilihan terbatas dapat menghasilkan kemiripan.

Tanda dan keputusan peninjauan disimpan terpisah dari jawaban. Menandai sesuatu tidak otomatis menghapus, mengubah, menolak pengiriman, atau mengecualikan jawaban dari agregat. Catat akun peninjau, waktu, keputusan, dan alasan agar keputusan dapat ditelusuri. Tidak ada pencarian lintas workspace atau pencocokan responden lintas pelanggan.

## Retensi dan pengoperasian saat ini

Versi ini tidak menyediakan masa kedaluwarsa otomatis untuk profil surveyor, atribusi, atau catatan peninjauan. Arsip dan sampah juga mempertahankan data agar dapat dipulihkan. Cadangan yang dibuat operator dapat memuat data tersebut. Operator perlu menetapkan prosedur dan retensi operasional sebelum memperluas penggunaan, termasuk penanganan perubahan rekening, penarikan persetujuan, survei yang dihapus, dan cadangan.

Enkripsi database tidak menggantikan pembatasan akses. Lindungi kunci, database, cadangan, ekspor, log, serta lingkungan preview. Rotasi kunci memerlukan rencana migrasi atau akses data lama dapat hilang. Jangan mengirim ciphertext, nomor penuh, atau kunci ke client, log, fixture publik, dan laporan kegagalan pengujian. Hindari memasukkan data rekening nyata ke pengujian.

Sebelum rilis, cocokkan pemberitahuan publik dengan endpoint final dan lakukan pemeriksaan akses pemilik/akun lain/admin, mask rekening, ciphertext tanpa plaintext, penugasan dicabut, link tidak sah, serta atribusi tidak dapat dipalsukan lewat payload. Batas QA visual yang belum dilakukan perlu dicatat terpisah; dokumen privasi tidak membuktikan pengujian tersebut telah selesai.

## Rujukan resmi

[UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi — JDIH BPK](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022) menjadi rujukan untuk peninjauan operator, termasuk pengenalan data keuangan pribadi sebagai data pribadi spesifik. Ini tidak menyatakan aplikasi telah memenuhi seluruh kewajiban undang-undang. Identitas badan pengelola, dasar pemrosesan untuk tiap kegiatan, penanganan hak, lokasi/transfer penyimpanan, kewajiban insiden, dan retensi perlu ditinjau sesuai pengoperasian nyata.
