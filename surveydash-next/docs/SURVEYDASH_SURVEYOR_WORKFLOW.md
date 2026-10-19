# Portal Surveyor dan cleaning data — 19 Oktober 2026

Branch fitur: `codex/surveyor-workflow`, berdasarkan revisi `61afb8b`. Akun lama tetap Pengelola Survei. Jawaban pengguna: rekening wajib untuk surveyor; rekening responden hanya bila ditanyakan; surveyor hanya membuka penugasan; username unik, nama lengkap boleh sama.

## Cara memakai

1. Di home pilih **Pengelola Survei** untuk membuat pertanyaan, atau **Surveyor** untuk menerima tugas. Responden memiliki jalur portal tersendiri dan tidak perlu login untuk mengisi form yang tersedia.
2. Surveyor mendaftar dengan nama lengkap, username unik, email/password, bank/penyedia, nama pemilik dan nomor rekening, serta persetujuan aktif. Login menerima email atau username. Username tidak dapat diganti; nama lengkap boleh diperbarui dan boleh sama dengan orang lain.
3. Pengelola membuka menu **Surveyor** (juga tersedia di beranda dan editor survei), memilih survei, lalu **Undang Surveyor** → **Salin link undangan**. Kirim link melalui pesan pribadi. Penerima daftar atau masuk, lalu memilih **Bergabung**; namanya muncul pada daftar Surveyor pengelola. Akun yang sudah terdaftar juga dapat ditambahkan melalui **Tambahkan dengan username**. Tidak ada daftar seluruh rekening atau akses ke profil pembayaran orang lain.
4. Surveyor masuk portal `/surveyor`, melihat tugas dan pertanyaannya dalam mode baca, lalu menyalin link pribadi. Link hanya dapat menerima jawaban saat survei terbuka dan tersedia bagi responden.
5. Penerima membuka `/r/[token]`. Form menampilkan nama dan username surveyor; penerima tidak mengetik nama surveyor. Token acak menjadi identitas penugasan di server, bukan nama dalam query yang dapat diganti bebas.
6. Setiap jawaban menyimpan snapshot identitas sumber. Pengelola melihat kolom Surveyor, mencari berdasarkan nama/username, dan mengekspor atribusi melalui CSV. Link langsung lama tetap berfungsi tanpa atribusi.
7. Cabut tugas untuk mematikan link. Mengaktifkan kembali tugas menghasilkan token baru; link lama tetap mati. Perubahan nama profil atau koreksi jawaban tidak menulis ulang sumber lama.
8. Buka **Cleaning data** di sidebar atau tab survei. Pilih pertanyaan yang merupakan nama responden dan, jika ada, pasangan bank/nomor rekening. Nomor rekening harus berupa teks agar nol depan bertahan.
9. Periksa kelompok nama, bank+rekening atau jawaban substantif yang sama. Bandingkan respons, beri status **Wajar**, **Perlu verifikasi** atau **Belum ditinjau**, serta alasan. Riwayat mencatat akun peninjau sebenarnya. Koreksi respons membuat tinjauan sebelumnya ditandai usang.

Cleaning memberi indikasi, bukan bukti kecurangan. Nama umum, rekening bersama dan pertanyaan dengan pilihan terbatas dapat menghasilkan kemiripan yang wajar. Tidak ada penghapusan, pengecualian analisis, perubahan IKM, pembayaran atau verifikasi rekening otomatis.

## Penyederhanaan dan undangan — 20 Oktober 2026

Login memakai satu kartu dengan judul **Masuk** atau **Daftar**, label **Username** dan **Email**, serta pilihan peran yang ringkas. Pendaftaran Surveyor dibagi dua langkah: **Akun** → **Rekening**; tombol Kembali mempertahankan isian. Persetujuan tetap aktif dan tidak dicentang sebelumnya. Tujuan undangan dibawa melalui proses login/daftar, tanpa menerima URL redirect bebas.

Link undangan berlaku tujuh hari. Link ini dapat dibagikan kepada beberapa calon Surveyor dan siapa pun yang menerimanya dapat bergabung menggunakan akun Surveyor lengkap. Karena itu, bagikan melalui pesan pribadi. Ini berbeda dari **Link responden** `/r/[token]`, yang digunakan untuk mengisi jawaban. Mematikan undangan mencegah pendaftar baru, tanpa mengeluarkan Surveyor yang sudah bergabung. Menonaktifkan Surveyor tetap mematikan link respondennya; undangan lama maupun baru tidak dapat mengaktifkan penugasan tersebut kembali.

Tabel tambahan `surveyor_invitations` menyimpan token acak, pemilik survei, akun pembuat, status serta waktu berlaku. Endpoint pengelola `/api/surveys/[id]/surveyor-invitation` memeriksa workspace dan origin untuk perubahan. `/invite/surveyor/[token]` hanya menampilkan judul/instansi sampai akun bergabung. Penerimaan melalui `/api/surveyor/invitations/[token]/accept` memeriksa role dan profil akun, token aktif serta survei yang belum diarsipkan/dibuang pada transaksi yang mengunci survei. Join berulang tidak menggandakan penugasan, dan link yang diaktifkan kembali mendapat token baru. Login/undangan memakai no-referrer, no-store dan noindex. Urutan restore telah diperbarui.

## Batas akses dan penyimpanan

- Role Surveyor ditentukan oleh profil tersimpan di server. `requireWorkspaceUser` dan resolver workspace menolak akun ini; mengganti cookie workspace atau payload role tidak memberinya akses pengelola. Portal dan halaman Studio juga memeriksa sesi/role.
- Pendaftaran Surveyor memakai Better Auth yang sudah ada. Profil divalidasi dan dipasang sebelum user/session diterbitkan melalui hook; pendaftaran gagal dibersihkan bila akun belum tercipta. Username memiliki constraint unik di database. Profil tanpa user autentikasi belum dapat ditugaskan.
- Rekening dienkripsi AES-256-GCM, memakai nonce acak dan AAD ID akun. Hanya profil akun sendiri mengembalikan nama bank/pemilik dan empat digit terakhir. Angka lengkap tidak dikirim pada halaman tugas, form publik, endpoint penugasan, ekspor survei, atau log. Aplikasi belum menyediakan UI admin untuk membaca rekening penuh atau membayar insentif.
- `SURVEYOR_DATA_SECRET` dapat menjadi kunci stabil khusus dengan minimal 32 karakter acak. Jika kosong, kunci diturunkan dari `BETTER_AUTH_SECRET` dengan domain berbeda dari sesi dan Google. Simpan kunci efektif secara privat bersama prosedur recovery. Mengganti kunci tanpa migrasi akan membuat rekening lama tidak terbaca; jangan merotasi rahasia sesi tanpa mempertimbangkan fallback ini.
- Link membuktikan sumber link yang dipakai, bukan identitas pengisi atau siapa yang benar-benar merekrutnya. Link dapat diteruskan. Server memvalidasi penugasan pada transaksi penyimpanan dan tidak mempercayai `surveyorId` dari browser. Idempotency key yang sudah dipakai tidak dapat dipindahkan ke sumber lain.
- Rekening responden tetap bagian jawaban bila memang ada pertanyaan yang relevan. Cleaning tidak membandingkannya dengan rekening profil surveyor. Pencocokan dibatasi pada survei pemilik yang sama; tampilan cleaning menyamarkan nomor rekening yang dipetakan.
- Deteksi cleaning membaca dataset survei di server dan memakai grouping linear. Payload daftar/perbandingan dipaginasi, sampel peer dibatasi. Dataset sangat besar masih memerlukan pengolahan bertahap/indeks khusus.

Kebijakan publik `/privacy` dan `/terms` diperbarui sesuai perilaku ini. Persetujuan surveyor tersimpan dengan versi `2026-10-19-surveyor-v1` dan waktu. Retensi/penghapusan menyeluruh masih ditangani operator, bukan proses otomatis. Rincian: `SURVEYDASH_SURVEYOR_PRIVACY.md`.

## Skema dan rute

Skema tambahan: `surveyor_profiles`, `surveyor_assignments`, `submission_attribution`, `cleaning_settings`, `cleaning_reviews`, `cleaning_review_audit`. Tidak mengganti tabel akun, password, respons, atau instrumen lama. Backup menemukan tabel otomatis; urutan restore telah diperbarui.

| Area                 | Rute                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| Pilihan peran/login  | `/`, `/login?role=manager`, `/login?role=surveyor`                         |
| Surveyor             | `/surveyor`, `/surveyor/profile`, `/api/surveyor`, `/api/surveyor/profile` |
| Penugasan pengelola  | `/api/surveys/[id]/surveyors`                                              |
| Form sumber surveyor | `/r/[token]`, `/api/referrals/[token]`                                     |
| Cleaning pengelola   | `/studio/cleaning`, `/studio/[id]/cleaning`, `/api/surveys/[id]/cleaning`  |
| Konteks login aktual | `/api/account/context`                                                     |

## Validasi pembaruan — 20 Oktober 2026

**50 tes otomatis**, **41 pemeriksaan HTTP lokal** (37 alur undangan dan 4 halaman/redirect), serta **9 pemeriksaan PostgreSQL** lolos. Alur mencakup undangan → pendaftaran → Bergabung → daftar Pengelola, origin/role/owner salah, identitas palsu pada body, join berulang, penugasan dicabut, undangan dimatikan/kedaluwarsa, dan penanganan join bersamaan. Tes PostgreSQL memakai schema QA khusus tanpa `public`; schema dihapus dan ketidakhadirannya diverifikasi. Strict ESLint seluruh `src` serta pemeriksaan ulang komponen yang berubah lolos. Build produksi lokal lolos, termasuk TypeScript dan 30 halaman statis, menggunakan database build terpisah. Pemeriksaan HTTP menguji keluaran server, bukan interaksi browser pada langkah formulir atau tombol salin.

Staging dicadangkan pada 20 Oktober WIB sebelum menambah `surveyor_invitations`; seluruh isi 22 tabel lama tetap identik dengan backup dan tabel baru tidak berisi fixture. Production tidak dimigrasikan atau dirilis. Peringatan Better Auth tentang tipe `rateLimit.lastRequest` tetap sama. QA visual masih tertahan oleh kebijakan izin browser tersimpan seperti dicatat di bawah.

## Validasi sebelumnya — 19 Oktober 2026

Unit/repository: **42 tes lolos**. HTTP lokal: **69 pemeriksaan lolos** pada database terpisah; termasuk registrasi nyata Better Auth, consent/username, enkripsi/masking, login username, pembatasan role, dua sumber link, pemalsuan payload, retry, revoke/rotasi, review/audit/konflik dan koreksi setelah review. Rate limiter tetap aktif; harness menunggu `Retry-After` saat membuat banyak akun sintetis.

PostgreSQL: **34 pemeriksaan lolos**, termasuk konkurensi idempotensi, review, dan pencabutan saat submit. Seluruh fixture berada pada schema QA staging terpisah, dengan `search_path` tanpa `public`; schema sudah dihapus dan ketidakhadirannya diverifikasi. Tidak ada baris customer/production yang dipakai untuk uji ini.

Build produksi lokal lolos, termasuk TypeScript dan 30 halaman statis. Pemeriksaan HTTP halaman lolos **15**, regresi alur survei **26**, dan berbagi presentasi **38**. Dua pemeriksaan HTTP tambahan memastikan Surveyor dengan grant admin tetap ditolak dan Pengelola admin tetap diizinkan. Bersama 69 pemeriksaan fitur, totalnya **150 pemeriksaan HTTP lokal**. Ini memeriksa respons server dan alur data, bukan tampilan browser. Laporan rinci privat disimpan di ignored `test-results/`; data rekening/password uji tidak menjadi artefak rilis. QA visual/browser tetap tertahan oleh penolakan izin tersimpan atau kebijakan aplikasi yang sebelumnya terjadi, meskipun pengguna telah mengizinkan preview lokal. Tidak ada klaim Lighthouse/WCAG atau pemeriksaan tampilan baru.

Staging telah dicadangkan secara privat pada 19 Oktober 2026 WIB. Setup menambah enam tabel tersebut; seluruh baris pada 16 tabel lama identik dengan backup, dan tabel baru tidak berisi fixture uji. Target staging diperiksa berbeda dari production. Better Auth masih mengeluarkan peringatan tipe `rateLimit.lastRequest` (`int8`/`number`) yang sudah ada; tidak ada perubahan destruktif untuk mengatasinya.

Sebelum production: selesaikan QA visual, verifikasi kebijakan/operasi data dan kunci, backup baru, serta migration/preservation check pada target yang benar. Jangan mempromosikan preview ke production hanya karena build lolos.
