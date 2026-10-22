# Audit kesesuaian master brief — 14 Oktober 2026

## Tindak lanjut revisi

Implementasi lanjutan berada pada branch `codex/surveydash-revisions`, berdasarkan persetujuan pengguna untuk revisi dan penggunaan open source. Email publik yang disetujui adalah `help@surveydash.id`; pengguna meminta konfigurasi SMTP karena layanan email belum tersedia. Tabel audit awal di bawah merupakan temuan **sebelum revisi**, bukan status kode terbaru.

| Temuan awal                       | Hasil revisi                                                                                                                                     | Batas verifikasi                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Header/menu mobile                | Header sticky dan menu mobile berbasis dialog Radix dengan navigasi publik lengkap                                                               | Implementasi tersedia; QA visual pada 375/768/1024/1440 belum dapat dijalankan      |
| Inspector selalu terlihat         | Tersembunyi saat belum memilih objek; terbuka saat memilih dan dapat ditutup; pengaturan slide dapat dibuka eksplisit                            | TypeScript/lint; drag/resize setelah perubahan panel belum diulang melalui browser  |
| Preflight generation umum         | Ringkasan respons/target, demografi, kelengkapan sembilan unsur IKM dan distribusi yang tersedia; sumber aktual dimuat sebelum tombol buat aktif | Uji sumber kosong, IKM null dan penolakan IKM survei kustom                         |
| Data dimuat seluruhnya ke browser | Pagination/filter/sort server, metadata ringan, CSV seluruh hasil pencarian dengan streaming                                                     | SQLite dan PostgreSQL diuji; analisis masih membaca seluruh respons di server       |
| Akun belum punya foto             | Unggah PNG/JPG/WebP, normalisasi dan avatar privat 128px                                                                                         | HTTP menguji ownership, admin workspace, asal permintaan dan penolakan SVG          |
| Recovery belum tersedia           | Halaman request/reset, adapter SMTP dengan TLS, token 30 menit sekali pakai dan pencabutan sesi                                                  | Pengiriman SMTP lokal nyata lolos; kredensial/sender production belum tersedia      |
| Google hanya JSON                 | OAuth PKCE/state, token terenkripsi, API resmi berdasarkan link editor/ID, preview dan JSON fallback                                             | Logika keamanan diuji; Google client/consent dan alur provider nyata belum tersedia |
| Kontak data belum tersedia        | `help@surveydash.id` tampil sebagai kontak privat pada Contact/Privacy dan fallback recovery                                                     | Alamat disetujui; provisioning mailbox/DNS belum diverifikasi                       |

Pada audit awal, kolaborasi tim/undangan dan pembayaran ditunda sesuai brief. Arahan pengguna pada 23 Oktober 2026 kemudian mengizinkan undangan rekan Pengelola ke satu workspace; implementasinya dijelaskan di `SURVEYDASH_WORKSPACE_TEAM.md`. Pembayaran tetap ditunda karena harga/provider/merchant belum dikonfirmasi. Roadmap lain pada audit awal mencakup ekspor XLSX, branching form, preferences lengkap, SQL aggregation untuk analisis besar, dan penghapusan aset; rincian progres fitur merujuk dokumen implementasi yang lebih baru. Better Auth dipertahankan agar akun dan sesi yang ada tetap kompatibel.

**Release tertahan:** walaupun pengguna mengizinkan preview lokal, tool browser tetap menolak origin lokal karena izin tersimpan atau kebijakan aplikasi. Tidak ada screenshot, Lighthouse atau klaim WCAG baru untuk revisi ini. Gate production dari master brief belum terpenuhi; production belum diubah. Hasil tes dan status preview dicatat dalam `SURVEYDASH_REVISION_VALIDATION.md`.

## Audit awal sebelum revisi

Referensi: `SURVEYDASH_STUDIO_MASTER_BUILD_AGENT.md` versi 1.0, yang diberikan pengguna. Kode yang diperiksa: commit `1dad32e76e68b68a1f6f0d5e8ea645b7ddeeb271`.

**Kesimpulan:** arah brand dan sebagian besar alur inti sudah sesuai. Seluruh target master brief belum selesai. Integrasi eksternal yang ditunda tidak dihitung sebagai fitur selesai; penundaan tersebut memang diperbolehkan oleh brief apabila prasyarat belum terpenuhi.

## Kesesuaian per area

| Area                           | Status                                            | Bukti dan batasnya                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand dan identitas            | Terpasang                                         | Komponen `Brand` menggunakan logo transparan terbaru; ikon aplikasi, favicon dan Apple touch icon tersedia. Logo PNG production sama persis dengan file lokal. Tampilan halaman belum diperiksa ulang secara visual dalam audit ini.                                                                                                                                                                                                |
| Landing dan halaman publik     | Sebagian besar tersedia                           | Landing, Features, Pricing, Help, Contact, Privacy, Terms dan portal responden ada. Header belum sticky; navigasi header disembunyikan pada HP tanpa menu pengganti.                                                                                                                                                                                                                                                                |
| Beranda dan pengelolaan survei | Alur inti tersedia                                | Lima pilihan mulai membuat, pencarian, filter, urutan, tabel/kartu, template, duplikasi, arsip dan sampah yang dapat dipulihkan. Plan/usage berada di bagian bawah sidebar.                                                                                                                                                                                                                                                         |
| Form dan pengumpulan respons   | Alur inti tersedia                                | Autosave dengan debounce, status simpan, versi, peringatan perubahan belum tersimpan, preview, kontrol publikasi dan penyimpanan respons. Uji repository mencakup validasi, idempotensi, koreksi dan penjagaan jawaban lama.                                                                                                                                                                                                        |
| Data                           | Sebagian                                          | Tabel mulai read-only; pencarian, sorting, kolom, detail, koreksi dengan audit dan CSV tersedia. Filter/pagination masih di browser setelah seluruh respons dimuat. Server pagination untuk dataset besar belum tersedia. Ekspor XLSX belum tersedia.                                                                                                                                                                               |
| Analisis SKM/IKM               | Alur inti tersedia                                | Kalkulasi dan ID pilihan tetap dipertahankan, sembilan unsur divalidasi, jawaban kosong tidak diubah menjadi skor satu. Tes model dan pembangkitan slide SKM lolos.                                                                                                                                                                                                                                                                 |
| Presentation Studio            | Sebagian besar fitur editor tersedia              | Slide, teks, bentuk, grafik, gambar, drag/resize, rotasi, lapisan, undo/redo, zoom, tema, autosave, versi, refresh data, preview dan ekspor tersedia. Inspector desktop selalu tampil, termasuk saat tidak memilih objek; belum sesuai permintaan inspector kontekstual yang dapat ditutup. Preflight generator baru memberi peringatan umum dan pengecualian IKM untuk survei kustom, belum ringkasan kelengkapan data yang rinci. |
| Ekspor dan sharing presentasi  | Tersedia dengan batas yang dijelaskan             | PDF/PPTX memakai gambar tiap slide; teks/grafik hasil PPTX tidak dapat diedit secara terpisah. Batas ini diperbolehkan brief jika dijelaskan dan diuji. Sharing opt-in, snapshot yang ditinjau, pembatasan aset dan pencabutan diuji. Hasil ekspor tidak dibuka ulang dalam audit ini.                                                                                                                                              |
| Auth dan akun                  | Login tersedia; recovery belum tersedia           | Implementasi aktual adalah Better Auth dengan email/password. Tidak ada konfigurasi pengiriman email pemulihan password. Pengaturan nama dan identitas workspace tersedia; profil/preferences belum selengkap daftar target.                                                                                                                                                                                                        |
| Workspace, tim dan admin       | Isolasi personal/admin tersedia; tim ditunda      | Kepemilikan data per akun dan pemilihan workspace oleh admin eksplisit tersedia dan diuji. Membership workspace bersama, role tim dan undangan belum diimplementasikan.                                                                                                                                                                                                                                                             |
| Google Forms                   | Sebagian                                          | Import JSON resource Form resmi dengan preview dan peringatan item tidak didukung tersedia. OAuth connect/callback, pemilihan form dari akun dan pengambilan melalui API belum tersedia. Ini membutuhkan pekerjaan integrasi serta konfigurasi provider, bukan sekadar mengaktifkan tombol.                                                                                                                                         |
| Plan, pembayaran dan billing   | Free/usage tersedia; pembayaran ditunda           | Penggunaan aktual dan quota Free yang dapat dikonfigurasi tersedia. Tier berbayar, subscription/entitlement berbayar, checkout, webhook dan invoice belum tersedia. UI menyatakan batas tersebut secara jujur; harga tentatif dalam brief belum boleh dianggap harga yang disetujui.                                                                                                                                                |
| Dukungan dan privasi           | Sebagian                                          | Bantuan dan tautan isu GitHub tersedia. Halaman Contact production belum menampilkan email privat untuk permintaan terkait data.                                                                                                                                                                                                                                                                                                    |
| QA dan release                 | Bukti dasar tersedia; audit lengkap belum selesai | Tes repository saat audit lolos. Build, TypeScript dan lint lolos pada pengerjaan logo di sesi ini. Dokumen rilis menyimpan hasil smoke, backup dan restore sebelumnya. Belum ada pemeriksaan visual baru pada empat ukuran layar, audit performa dan aksesibilitas lengkap yang diverifikasi dalam audit ini.                                                                                                                      |

## Perbedaan asumsi dokumen

Brief menyebut NextAuth/Auth.js sebagai stack yang telah dikonfirmasi. Kode dan dokumentasi arsitektur menunjukkan **Better Auth**. Mempertahankan autentikasi yang benar-benar sudah digunakan sesuai tujuan menjaga akun dan sesi lama. Acuan stack dalam brief perlu dikoreksi; perbedaan nama library ini tidak menjadi alasan untuk mengganti sistem login yang bekerja.

## Hasil pemeriksaan saat audit

- `node --import tsx --test tests/*.test.ts`: **21 lulus, 0 gagal**. Tes berjalan pada database SQLite sementara, termasuk isolasi akun/admin, quota/idempotensi, IKM, template, aset, versi presentasi dan sharing.
- HTTP production: `/`, `/pricing`, `/contact`, `/surveys`, `/login` dan `/brand/surveydash-studio-logo.png` mengembalikan **200**.
- Hash SHA-256 logo production sama dengan `public/brand/surveydash-studio-logo.png`. Halaman publik yang diperiksa mereferensikan aset logo tersebut.
- Contact production tidak menampilkan tautan `mailto:`.
- Build terakhir sebelum audit lolos, termasuk pemeriksaan TypeScript dan pembuatan 24 halaman statis. Lint juga lolos. Pemeriksaan HTTP hanya memastikan respons dan isi HTML/aset, bukan layout atau interaksi browser.
- Audit ini menggunakan kode, tes repository dan pemeriksaan HTTP. Browser preview lokal sebelumnya ditolak oleh gerbang izin browser. Alur login, ekspor, respons publik dan layout belum diulang melalui browser pada audit ini; pemeliharaan data production juga belum dibandingkan ulang dengan snapshot pada audit ini.

## Prioritas penyelesaian

1. Rapikan inspector presentasi dan navigasi publik mobile; tambahkan preflight kelengkapan data sebelum membangkitkan presentasi.
2. Verifikasi layout 375/768/1024/1440, alur penting melalui browser, aksesibilitas dan performa dengan bukti tersimpan.
3. Siapkan pagination/filter server untuk tabel Data dan jalur kontak privat yang nyata.
4. Kerjakan OAuth Google Forms dan email pemulihan dengan provider yang disetujui. Tetap bedakan impor JSON dari sambungan akun Google.
5. Lanjutkan tim/role dan subscription berbayar sebagai pekerjaan terpisah dengan migrasi, konfigurasi dan uji yang sesuai. Jangan mengaktifkan pembayaran hanya untuk mencocokkan daftar halaman.

## Rujukan kode

- `src/components/brand.tsx:8`: sumber logo.
- `src/components/public-frame.tsx:6` dan `src/app/product.css:919`: header dan navigasi mobile.
- `src/components/presentation-editor.tsx:786`: inspector yang selalu dirender.
- `src/components/presentation-hub.tsx:260`: pemberitahuan data sebelum generation.
- `src/components/response-table.tsx:215` dan `src/app/studio/[id]/page.tsx:22`: pagination browser dan pemuatan respons.
- `src/components/forms-import.tsx:142`: status OAuth.
- `src/lib/auth.ts:11`: konfigurasi autentikasi email/password.
- `src/lib/db.ts:69`: workspace personal/admin; belum skema membership tim/subscription.
- `src/app/studio/settings/membership/page.tsx:49`: status paket berbayar.
- `src/app/contact/page.tsx:34`: kontak privat yang bergantung konfigurasi.

Dokumen rilis dan implementasi sebelumnya: `docs/SURVEYDASH_RELEASE.md`, `docs/SURVEYDASH_IMPLEMENTATION_REPORT.md`, `docs/SURVEYDASH_ARCHITECTURE.md`.
