# Audit SurveyDash Studio — 23 Oktober 2026

Basis kode: `050ab28a886b354cfe2184df9620d4c069f62ed1`, branch `codex/workspace-team-provinces`.
Website yang diperiksa: [SurveyDash Studio](https://surveydash-studio.vercel.app).

## Kesimpulan

Alur inti sudah tersedia: pembuat survei, anggota workspace, undangan surveyor, link atribusi per survei, form tanpa login, impor pertanyaan dan jawaban, ekspor Excel/CSV, cleaning, analisis, presentasi, serta peta provinsi. Kebutuhan berikutnya adalah menjaga ketepatan workspace, menetapkan data yang layak dianalisis, mengamankan pekerjaan lapangan saat koneksi terganggu, dan membuktikan kesiapan operasional pada volume survei nasional.

Dokumen [master awal](C:/Users/Haikal/Downloads/SURVEYDASH_STUDIO_MASTER_BUILD_AGENT.md:14) juga ditinjau sebagai referensi. Beberapa bagiannya telah digantikan permintaan terbaru: langganan dihilangkan dahulu, impor membawa jawaban lama bila dipilih, dan arah visual mengikuti revisi pengguna. Dokumen itu menyebut Auth.js, sementara implementasi aktual memakai Better Auth. Hal-hal tersebut perlu diselaraskan dalam spesifikasi; tidak dihitung sebagai fitur hilang yang harus dipaksakan kembali.

Ditemukan satu masalah tujuan penyimpanan yang berhasil direproduksi: permintaan membuat survei dari halaman lama dapat masuk ke workspace lain setelah cookie workspace diganti melalui tab lain. Cleaning masih berupa peninjauan terpisah dari analisis. Pemulihan password di produksi teramati nonaktif. Penonaktifan surveyor berlaku per penugasan; blacklist lintas survei belum tersedia.

Prioritas dalam laporan ini adalah urutan pengerjaan produk. P1 berarti perlu diselesaikan atau diberi mitigasi yang jelas sebelum penggunaan nasional; P2 berarti iterasi berikutnya; P3 berarti penyempurnaan. Advisory dependency dinilai terpisah dari bukti bahwa suatu jalur aplikasi dapat dieksploitasi.

## Cakupan dan bukti pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Kode alur akun, workspace, penugasan, form, penyimpanan, cleaning, analisis, ekspor, presentasi, privasi, backup/restore | Ditinjau pada commit di atas |
| `pnpm test` | 106 tes lulus; 0 gagal |
| `pnpm lint` | Lulus, tanpa warning |
| `pnpm typecheck` | Lulus |
| HTTP GET produksi | 8 pemeriksaan: home, login, pemulihan password, portal survei, privasi, auth health, serta dua API privat |
| API admin dan tim tanpa sesi | Keduanya menolak dengan 401 |
| Pemulihan password produksi | Login dan halaman pemulihan mengirim flag ketersediaan `false` |
| Reproduksi konteks workspace | Berhasil melalui HTTP lokal dengan dua akun sintetis dan satu cookie jar, dalam database terisolasi |
| `pnpm audit --prod --json` | 3 advisory: 2 high pada `image-size`, 1 moderate pada `uuid`; 0 critical dilaporkan oleh perintah ini |
| Browser, layout HP/desktop, hover, keyboard, tutorial interaktif | Belum diverifikasi secara langsung pada audit ini |
| Uji beban nasional, pemulihan backup terbaru, pengiriman email produksi, MFA, pengaturan backup/alert penyedia | Belum dibuktikan oleh audit ini |

Pemeriksaan produksi hanya menggunakan GET tanpa mengubah data bisnis atau mengirim email. Pengujian mutasi dilakukan secara lokal. Server audit lokal sudah dihentikan. Lulus tes tidak membuktikan seluruh tampilan maupun kapasitas produksi.

Artefak reproduksi dan hasil HTTP tersimpan lokal dalam `test-results/product-audit-workspace-context.json` dan `test-results/product-audit-http.json`. Folder tersebut diabaikan Git. Laporan ini tidak memuat kredensial atau jawaban responden.

## Temuan dan tindakan

### 1. P1 — Tujuan penyimpanan dapat berubah saat dua tab memakai workspace berbeda

**Status: masalah perilaku berhasil direproduksi melalui HTTP.**

Workspace aktif disimpan dalam cookie bersama. API membuat survei menentukan pemilik dari cookie pada saat permintaan diterima; payload tidak menyertakan workspace yang diharapkan oleh halaman.

Reproduksi lokal:

1. Akun anggota bergabung ke workspace pemilik A.
2. Permintaan membuat survei dari konteks A masuk ke A.
3. Permintaan lain mengganti cookie ke workspace pribadi anggota B, sebagaimana dapat terjadi saat memakai tab lain.
4. Payload pembuatan yang sama dikirim lagi dan berhasil masuk ke B. Server tidak meminta konfirmasi perubahan tujuan.

Ini dapat menyebabkan survei dibuat di workspace klien yang keliru meskipun pengguna berwenang mengakses keduanya. Reproduksi ini tidak menunjukkan akses ke workspace pihak yang tidak berwenang; tes isolasi pemilik tetap lulus.

**Tindakan:** setiap mutasi membawa identitas workspace yang diharapkan, server memvalidasi keanggotaan dan kecocokan konteks, serta menolak konteks halaman yang sudah berubah. Identitas dari browser tetap harus diverifikasi server. Pertimbangkan konteks workspace dalam URL agar beberapa tab dapat bekerja secara independen. Saat akses dicabut, aksi dari halaman lama harus gagal dengan pesan jelas, bukan diam-diam berpindah tujuan ke workspace pribadi.

**Kriteria selesai:** uji dua tab/set permintaan paralel, perpindahan workspace, dan pencabutan anggota; pembuatan survei, impor, template, pengaturan, dan upload tidak boleh salah tujuan.

Bukti: [cookie workspace](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/workspace-session.ts:5), [resolusi akses](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/access-repository.ts:7), [konteks API](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/http.ts:15), [pembuatan survei](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/app/api/surveys/route.ts:14).

### 2. P1 — Hasil cleaning belum menentukan data yang masuk analisis

**Status: keterbatasan implementasi terkonfirmasi.**

Status yang tersedia adalah belum ditinjau, valid, dan perlu verifikasi. Penandaan kemiripan maupun review tidak mengeluarkan respons dari chart, presentasi, jumlah respons penugasan, atau capaian target. Analisis membaca seluruh respons. Pengelola dapat mengira data sudah dibersihkan padahal angka yang dilihat masih mencakup data yang diragukan.

**Tindakan:** tambahkan keputusan kelayakan respons yang terpisah dan tercatat, misalnya diterima, ditahan untuk verifikasi, dan dikeluarkan dengan alasan. Tampilkan **masuk / diterima / perlu ditinjau / dikeluarkan**, serta pilihan dataset yang konsisten di analisis, peta, presentasi, dan ekspor. Simpan data mentah dan jejak keputusan agar dapat diperiksa ulang. Tentukan dengan jelas apakah target mengacu pada respons masuk atau respons diterima.

Kemiripan nama tidak cukup untuk menyatakan responden fiktif. Penolakan dan sanksi surveyor perlu keputusan manusia dengan alasan dan bukti.

**Kriteria selesai:** satu respons yang dikeluarkan tidak ikut hasil dataset diterima; jumlah di seluruh tampilan dan ekspor cocok, keputusan dapat dibatalkan, dan koreksi jawaban membuat review lama perlu diperiksa ulang.

Bukti: [status cleaning](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/cleaning-model.ts:5), [pemisahan review dari kelayakan analisis](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/cleaning-model.ts:113), [sumber seluruh respons untuk analisis](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/responses-repository.ts:169), [hitungan penugasan](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/surveyor-repository.ts:32).

### 3. P1 — Pemulihan password belum aktif di produksi

**Status: teramati langsung pada respons HTTP produksi tanggal audit.**

Kode pemulihan melalui SMTP sudah ada, termasuk TLS, masa berlaku link 30 menit, pembatasan permintaan, dan pencabutan sesi setelah reset. Namun halaman login dan pemulihan pada website utama mengirim flag ketersediaan `false`. Audit tidak menentukan apakah penyebabnya flag dinonaktifkan atau konfigurasi belum lengkap, dan tidak mengirim email pengujian.

**Tindakan:** selesaikan konfigurasi layanan email, aktifkan pemulihan, dan uji pengiriman ke kotak email yang disetujui. Uji link kedaluwarsa, sekali pakai, dan pencabutan sesi. Pastikan kontak `help@surveydash.id` benar-benar dapat menerima permintaan bantuan; keberadaan alamat di UI belum membuktikan layanan kotak masuknya.

Verifikasi kepemilikan email dan MFA belum dikonfigurasi dalam implementasi autentikasi yang ditinjau. Jadwalkan verifikasi email dan MFA terutama untuk admin serta pemilik workspace. Responden tetap tidak memerlukan akun.

Bukti: [ketersediaan SMTP](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/email.ts:38), [konfigurasi autentikasi](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/auth.ts:39).

### 4. P1 — Blacklist surveyor lintas survei belum ada

**Status: kebutuhan operasional belum tersedia.**

Pengelola sudah dapat mencari surveyor dan menonaktifkan penugasan tertentu. Link penugasan yang dinonaktifkan tidak dapat dipakai, dan aktivasi ulang mengganti token. Tindakan itu tidak memblokir surveyor pada penugasan lain atau membatalkan respons historisnya.

**Tindakan:** buat pembatasan surveyor tingkat workspace, lengkap dengan alasan, bukti, pelaku, waktu, riwayat, dan pemulihan akses. Pembatasan harus menghentikan seluruh penugasan serta penerimaan undangan baru di workspace itu. Pemblokiran lintas seluruh platform hanya melalui admin dengan kewenangan dan peninjauan yang jelas. Respons lama masuk antrean review; jangan otomatis menghapusnya.

**Kriteria selesai:** surveyor yang dibatasi tidak dapat memakai link tugas lama atau bergabung ulang melalui undangan baru pada cakupan yang dibatasi. Workspace lain tetap mengikuti kewenangannya sendiri.

Bukti: [penonaktifan per penugasan](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/surveyor-repository.ts:161), [validasi link](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/surveyor-repository.ts:248).

### 5. P1 — Jawaban dan identitas percobaan kirim hilang saat halaman dimuat ulang

**Status: terkonfirmasi dari penyimpanan state komponen; interaksi browser belum diuji.**

Jawaban disimpan dalam state React dan kunci pengiriman di `useRef`. Gagal jaringan tetap mempertahankan jawaban selama halaman masih terbuka. Refresh atau penutupan halaman menghapus keduanya. Jika server sudah menyimpan tetapi balasannya tidak diterima, pengisian ulang setelah refresh dapat membuat respons baru; jaminan retry saat ini berlaku selama kunci yang sama digunakan.

**Tindakan:** sediakan pemulihan draft dan retry dengan kunci stabil, terikat survei/link/sesi pengisian. Pertimbangkan bahwa satu perangkat surveyor dapat dipakai bergantian oleh beberapa responden: jawaban tidak boleh otomatis muncul untuk orang berikutnya. Beri pilihan lanjutkan atau mulai pengisian baru, masa kedaluwarsa pendek, pembersihan setelah berhasil, serta keterangan penyimpanan di perangkat. Antrian offline penuh dapat menyusul setelah mekanisme pemulihan dasar aman.

**Kriteria selesai:** gangguan jaringan, refresh, dan balasan yang hilang tidak membuat pekerjaan hilang atau respons ganda pada satu percobaan; memulai responden baru selalu menghasilkan sesi kosong.

Bukti: [state jawaban](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/components/public-form.tsx:28), [kunci retry](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/components/public-form.tsx:34), [pencegahan pengiriman ulang di server](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/repository.ts:258).

### 6. P1 — Kapasitas nasional dan pemulihan data besar belum dibuktikan

**Status: pola pembacaan seluruh dataset terkonfirmasi; batas kapasitas aktual belum diukur.**

Tabel respons sudah memakai pagination server dan ekspor menggunakan batch/stream. Namun analisis, cleaning, refresh presentasi, serta pengecekan kompatibilitas saat menyimpan survei masih membaca seluruh respons. Backup mengumpulkan seluruh tabel dalam memori; restore membuat satu perintah INSERT besar untuk setiap tabel. Ini perlu pengujian ukuran data dan beban, bukan kesimpulan bahwa server sudah gagal pada angka tertentu.

**Tindakan:** ukur pada staging terisolasi dengan dataset dan jumlah pengguna serentak sesuai rencana lapangan, termasuk cadangan lonjakan. Optimalkan agregasi SQL, pengecekan keberadaan respons tanpa membaca semua jawaban, cleaning bertahap, serta backup/restore per batch atau alat database yang sesuai. Pengiriman respons mengambil lock survei dalam transaksi; dampaknya pada pengiriman serentak juga perlu diukur.

**Kriteria selesai:** ada hasil terukur untuk waktu pengiriman, analisis, cleaning, ekspor, pemakaian memori, antrean koneksi, dan keberhasilan restore pada ukuran yang ditargetkan. Tidak perlu melakukan uji beban pada produksi dalam audit ini.

Bukti: [seluruh respons untuk analisis](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/responses-repository.ts:175), [cleaning sebelum pagination](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/cleaning-repository.ts:134), [pembacaan saat autosave](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/repository.ts:148), [backup](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/scripts/backup.ts:10), [restore satu batch per tabel](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/scripts/restore-staging.ts:68).

### 7. P2 — Perubahan wilayah tugas memindahkan hitungan historis

**Status: perilaku saat ini terkonfirmasi dan sudah dijelaskan di kebijakan privasi.**

Peta menghitung respons berdasarkan provinsi penugasan saat ini. Bila satu tugas awalnya Jawa Barat memperoleh 100 respons lalu dipindahkan ke Jawa Tengah, 100 hitungan itu ikut pindah. Jawaban asli tetap utuh. Ini sesuai model saat ini, tetapi berisiko untuk membandingkan capaian wilayah dari waktu ke waktu.

**Tindakan:** simpan snapshot provinsi penugasan pada saat respons diterima, atau gunakan periode penugasan yang memiliki tanggal berlaku. Perubahan historis perlu tindakan koreksi tersendiri dengan audit. Data lama tanpa bukti wilayah jangan dipetakan ulang dengan perkiraan. Tetap beri label **wilayah tugas**, sesuai pilihan pengguna; angka tersebut tidak membuktikan domisili atau GPS responden. Jumlah respons juga belum membuktikan jumlah manusia unik.

Bukti: [agregasi provinsi saat ini](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/assignment-map.ts:4), [atribusi tanpa snapshot provinsi](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/repository.ts:294).

### 8. P2 — Konflik edit bersama belum memiliki alur penyelesaian yang nyaman

**Status: hambatan alur teridentifikasi dari kode.**

Server menolak versi survei yang tertinggal dengan 409; ini melindungi perubahan orang lain. Editor menyimpan perubahan lokal sebagai dirty, tetapi tombol refresh meminta pengguna menyimpan dahulu. Penyimpanan tetap akan ditolak sampai versi diperbarui. Memuat ulang halaman dapat membuang perubahan lokal.

**Tindakan:** berikan tindakan jelas: simpan salinan draft lokal, bandingkan versi, atau buang perubahan lokal dan ambil versi terbaru. Pesan konflik menyebut langkah yang benar dan tidak mengarahkan pengguna ke siklus simpan–refresh. Terapkan pola serupa pada presentasi yang diedit bersama.

Bukti: [penolakan versi lama](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/repository.ts:137), [save editor](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/components/survey-editor.tsx:150), [refresh menolak draft dirty](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/components/survey-editor.tsx:188).

### 9. P2 — Tiga advisory dependency perlu ditangani dengan uji kompatibilitas

**Status: hasil audit registry pada lockfile saat ini; eksploitasi aplikasi tidak dibuktikan.**

| Jalur | Hasil audit | Penilaian pemakaian aplikasi |
| --- | --- | --- |
| `pptxgenjs@4.0.1 → image-size@1.2.1` | 2 advisory high untuk parser gambar; versi perbaikan yang tercantum 2.0.3 | Ekspor aplikasi berjalan di browser menggunakan PNG hasil render slide. Paket PptxGenJS juga menandai `image-size` sebagai `false` pada konfigurasi browser. Belum ditemukan jalur aplikasi yang mengirim berkas HEIF/JXL/ICNS mentah ke parser ini. |
| `exceljs@4.4.0 → uuid@8.3.2` | 1 advisory moderate terkait v3/v5/v6 dengan buffer | Pemakaian yang ditemukan dalam ExcelJS adalah `uuid.v4()`; belum menunjukkan jalur fungsi rentan. |

**Tindakan:** perbarui dependensi atau dependency transitif melalui perubahan terpisah, verifikasi API lintas versi, lalu uji unduh XLSX/PPTX. Jangan melakukan override major secara buta. Temuan audit registry tetap perlu ditutup atau diberi pengecualian dengan bukti jalur dan penanggung jawab.

Sumber: [advisory parser JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [advisory parser ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [advisory uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Jalur ekspor: [render slide menjadi PNG](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/components/presentation-editor.tsx:484).

### 10. P2 — Hak anggota workspace masih luas

**Status: model akses saat ini, bukan kegagalan guard.**

Undangan yang diterima memberi akses pengelolaan survei dan data workspace secara luas. Pemilik mengatur link dan keanggotaan; anggota biasa tidak dapat mengundang atau mencabut anggota lain. Link berlaku tujuh hari dan dapat diteruskan kepada akun Pengelola lain.

**Tindakan berikutnya:** ketika tim bertambah, tambah peran editor, pembaca hasil, dan koordinator lapangan, dengan pembatasan per survei bila diperlukan. Undangan untuk data sensitif dapat dibatasi ke email penerima atau membutuhkan persetujuan pemilik sebelum aktif. Ini penguatan model berbagi yang sudah dipilih, bukan alasan untuk mengubah alur undangan tanpa kebutuhan.

Bukti: [penerimaan keanggotaan](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/workspace-team.ts:126), [pemeriksaan akses tiap permintaan](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/access-repository.ts:7).

## Kesiapan operasional yang perlu dilengkapi

| Area | Kondisi yang dapat dibuktikan | Yang masih dibutuhkan |
| --- | --- | --- |
| Cadangan | Script backup dan restore staging ada; file backup aplikasi berupa JSON dan memuat data akun, sesi, serta jawaban | Pastikan jadwal, penyimpanan terpisah yang terlindungi, enkripsi cadangan, retensi, penanggung jawab, serta uji pemulihan seluruh tabel versi terbaru. Backup/PITR bawaan penyedia belum diperiksa; tidak dinyatakan tidak ada. |
| Kunci rekening | AES-GCM ada; kunci rekening dapat fallback ke secret autentikasi | Pastikan kunci data khusus tersimpan aman, cadangannya terpisah, dan rotasi melalui migrasi yang diuji. Mengganti kunci tanpa migrasi dapat membuat rekening lama tidak terbaca. Konfigurasi rahasia produksi tidak ditampilkan atau diubah pada audit ini. |
| Pemantauan | Wrapper error menghindari pencetakan jawaban, tetapi hanya mencatat nama error | Tambah ID kejadian, konteks rute dan kegagalan yang sudah disanitasi, alert lonjakan error, serta probe database dan layanan penting. `/api/auth/ok` tidak membuktikan seluruh database dan SMTP sehat. Pengaturan alert penyedia belum diperiksa. |
| Retensi dan permintaan data | Kebijakan privasi dan kontak support ada; arsip/sampah mempertahankan data; penghapusan menyeluruh masih manual | Tetapkan masa retensi per jenis data, petugas dan proses permintaan, penghapusan yang dapat diaudit, serta aturan untuk salinan cadangan. |
| Rilis dan dokumentasi | Setup, tes, build, serta runbook ada; README/arsitektur memuat keterangan lama yang bertentangan dengan fitur aktual | Perbarui sumber acuan fitur, prosedur migrasi/rollback, dan restore. Catat migrasi aplikasi secara berurutan serta tambahkan jalur pengujian upgrade. Tidak ditemukan workflow GitHub Actions di checkout yang ditinjau; hal itu tidak berarti pemeriksaan Vercel atau layanan eksternal tidak tersedia. |
| Audit tindakan | Koreksi jawaban dan review cleaning memiliki riwayat; sebagian perubahan lain hanya menyimpan pelaku/waktu terakhir | Satukan riwayat penugasan, perubahan wilayah, pencabutan akses, blacklist, dan penguncian hasil agar supervisor dapat menelusuri keputusan. |

Bukti tambahan: [kunci enkripsi](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/surveyor-profile.ts:44), [logging API](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/lib/http.ts:79), [retensi yang dijelaskan di privasi](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/src/app/privacy/page.tsx:72), [README yang tertinggal](C:/Users/Haikal/Documents/GitHub/SurveyDash/surveydash-next/README.md:90).

## Fitur berikutnya yang paling relevan

Ini rekomendasi pengembangan, bukan daftar bug atau janji seluruhnya diperlukan sebelum pilot.

| Kebutuhan | Bentuk yang disarankan | Prioritas |
| --- | --- | --- |
| Pengawasan lapangan | Koordinator wilayah; daftar surveyor per survei; respons masuk, diterima, ditahan, target, dan aktivitas terakhir | P2 setelah kelayakan respons tersedia |
| Wilayah lebih rinci | Kabupaten/kota dan kecamatan bila memang dipakai dalam desain penugasan; sumber wilayah dan versi katalog jelas | P2 sesuai kebutuhan lapangan |
| Pemeriksaan kualitas | Waktu mulai/selesai, durasi, catatan verifikasi dan hasil tindak lanjut, dengan pemberitahuan pengumpulan yang sesuai | P2; setiap tanda tetap ditinjau manusia |
| Form panjang | Bagian/halaman, logika lompat bersyarat, validasi per jenis pertanyaan, dan pratinjau alur sebelum dibuka | P2; tujuh tipe pertanyaan dasar sudah ada |
| Analisis lebih berguna | Filter tanggal, wilayah penugasan, surveyor dan kelayakan respons yang konsisten; tabulasi silang dua pertanyaan | P2; chart dasar dan pilihan jenis chart sudah ada |
| Hasil penelitian final | Versi dataset yang dikunci setelah review, catatan metode, dasar hitungan setiap persentase, waktu pembaruan dan jejak koreksi | P2 sebelum publikasi hasil resmi |
| Pembobotan | Kolom bobot, validasi bobot, penjelasan jumlah mentah dan berbobot, bila rancangan penelitian memerlukannya | Sesuai rancangan peneliti; belum tersedia otomatis |
| Presentasi untuk rapat | PPTX dengan teks/chart yang dapat diedit, opsi ekspor ringkas, dan lampiran data/metode | P3; ekspor PPTX/PDF saat ini berupa gambar slide dan sudah berfungsi |
| Administrasi honor surveyor | Rekap berdasarkan respons yang diterima, status pemeriksaan dan pembayaran, serta audit perubahan | P3 sesuai proses kerja; rekening saat ini disimpan, transfer belum dijalankan aplikasi |

Peta capaian tugas dan banyaknya jawaban tidak sendiri membuktikan keterwakilan sampel nasional. Peneliti perlu menetapkan desain sampel, wilayah, instrumen, metode pengumpulan, serta aturan kelayakan dan pembobotan yang digunakan. Produk perlu merekam keputusan tersebut tanpa menciptakan nilai metodologis otomatis dari jumlah respons saja.

## Audit UX dan tutorial: pengujian yang masih harus diselesaikan

Kode tutorial sudah memiliki langkah berdasarkan target nyata, Next, Skip, pemulihan saat dialog ditutup, penyimpanan status per akun, serta pengujian rencana langkah. Tema gelap, motion dan preferensi reduced motion juga sudah diimplementasikan. Itu belum membuktikan posisi overlay, fokus keyboard, scroll, dan sentuhan sudah benar pada perangkat nyata.

Selesaikan QA browser dengan matriks berikut:

- Pengelola baru: daftar → tutorial → buat survei → tambah pertanyaan → buka survei → undang surveyor → lihat respons → unduh Excel.
- Anggota workspace: terima undangan → pastikan nama workspace → edit bersama → tangani konflik → berpindah tab → akses dicabut.
- Surveyor baru: daftar dan pilih provinsi → Next/Skip → terima tugas → baca pertanyaan → salin link → lihat hitungan masing-masing survei.
- Responden: buka link tanpa akun/tutorial → isi dengan keyboard/sentuhan → validasi → gangguan jaringan → kirim → konfirmasi berhasil.
- Admin: akses map seluruh surveyor, cari nama/provinsi, wilayah belum diisi, keyboard focus, hover dan tap, tanpa menampilkan rekening.
- Perangkat: lebar HP kecil, HP besar dan desktop; light/dark; zoom browser; reduced motion; koneksi lambat; nama/judul panjang; dataset kosong dan padat.

UI pemula sebaiknya menonjolkan satu aksi utama pada tiap halaman, menempatkan pengaturan lanjutan di bagian tersendiri, dan memberi status yang langsung dapat ditindaklanjuti. Responden tetap mengisi bebas tanpa login dan tanpa tutorial, sesuai kebutuhan pengguna.

Akses browser masih ditolak oleh pemeriksaan izin otomatis yang tersimpan pada sesi. Audit ini tidak mencoba jalur browser pengganti. Karena itu tidak ada klaim bahwa tampilan HP, desktop, hover atau tutorial sudah lolos QA visual.

## Urutan pengerjaan yang disarankan

1. **Benahi tujuan workspace dan konflik edit:** cegah data salah tempat, sediakan cara mempertahankan draft saat versi bertabrakan.
2. **Lengkapi operasi lapangan:** kelayakan respons, hitungan dataset konsisten, blacklist dengan cakupan dan kewenangan jelas, serta pemulihan password produksi.
3. **Amankan pengumpulan:** draft/retry yang tahan gangguan dengan perlindungan perangkat bersama, dan keputusan apakah wilayah historis perlu snapshot sebelum pengumpulan bertambah.
4. **Buktikan kesiapan:** uji beban staging, restore cadangan terbaru pada ukuran target, pemantauan kegagalan, dependency maintenance, dan QA browser/perangkat yang belum dapat dijalankan.
5. **Tambah kemampuan penelitian dan kenyamanan:** wilayah rinci, bagian/logika form, tabulasi silang, dataset final, hak anggota bertingkat, serta presentasi editable sesuai prioritas tim.

Fitur utama tidak diubah dan tidak ada rilis produksi baru selama audit ini. Tindakan perbaikan tetap perlu dikerjakan serta diverifikasi sebagai perubahan terpisah.
