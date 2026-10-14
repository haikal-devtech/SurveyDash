# SurveyDash Studio

Proyek Next.js baru untuk mengelola seluruh proses survei dalam satu website: pembuat form → tabel respons → analisis → presentasi.

Versi online untuk pengujian: [surveydash-studio.vercel.app](https://surveydash-studio.vercel.app). Pilih **Buat workspace** untuk membuat akun baru. Akun dan data lokal tidak otomatis disalin ke cloud. Workspace baru dimulai kosong. Pilih **Coba contoh SKM** bila ingin mencoba data simulasi, atau langsung buat survei sendiri.

## Jalankan lokal

Memerlukan Node.js **24.15+** dan pnpm. Database lokal memakai `node:sqlite`, sehingga tidak membutuhkan akun layanan cloud untuk mencoba aplikasi.

```powershell
cd C:\Users\Haikal\Documents\GitHub\SurveyDash\surveydash-next
pnpm install
pnpm setup
pnpm dev
```

Buka **http://127.0.0.1:3100**. Pilih **Buat workspace** untuk membuat akun Anda. Contoh SKM tersedia melalui tombol **Coba contoh SKM** di beranda. Contoh memakai 48 respons simulasi berlabel, bukan hasil penelitian atau data DAMKAR yang sebenarnya.

Di Windows pada komputer ini, dependencies dan database sudah disiapkan. Anda juga dapat menjalankan **`start.cmd`** dari folder proyek untuk membuka server lokal tanpa mengetik perintah pnpm. Launcher menggunakan runtime Node.js Codex jika tersedia. Biarkan terminalnya terbuka selama memakai aplikasi.

Database dan rahasia sesi lokal ada pada `.data/` dan `.env.local`, keduanya diabaikan Git. Buat akun sendiri melalui **Buat workspace**.

`pnpm setup` membuat `.env.local` dengan rahasia acak jika belum ada, lalu memigrasikan tabel autentikasi. Menjalankannya kembali mempertahankan database dan akun yang ada.

## Fitur yang sudah bekerja

- Autentikasi email/kata sandi dengan Better Auth. Pemilik workspace hanya dapat membaca dan mengubah surveinya sendiri.
- Template SKM, evaluasi layanan, kepuasan pelanggan dan form kosong. Form, layout, paket survei dan dokumen slide dapat disimpan, dipratinjau, dipakai ulang, diduplikasi, diubah namanya, diarsipkan dan dipulihkan.
- Pembuat pertanyaan: teks, paragraf, pilihan tunggal/jamak, skala penilaian, angka, dan tanggal. Pertanyaan bisa digeser, dinaikkan/diturunkan, dan diduplikasi.
- Form publik dalam website yang sama, termasuk validasi wajib isi dan pengiriman yang tidak menggandakan respons saat permintaan dicoba ulang.
- Status **Draft / Buka / Tutup**, terpisah dari visibilitas **Publik / Link saja / Privat**. Publik masuk portal; link saja tersembunyi dari portal; privat tidak bisa diakses melalui link responden.
- Tabel respons dengan pencarian, pengurutan dan pagination di server, pilihan kolom, koreksi sel, dan ekspor CSV seluruh hasil pencarian. Koreksi menyimpan nilai sebelum/sesudah serta memakai revision untuk mendeteksi konflik.
- Analisis demografi, distribusi jawaban, capaian target, dan IKM. IKM hanya berlaku pada survei SKM dengan sembilan unsur. Nilai kosong tidak diberi skor 1.
- Studio slide 16:9 dengan teks, bentuk, gambar, pie/bar/tabel, metrik terikat ke data, drag/resize, lapisan, undo/redo, autosave, tema dan pratinjau. Inspector dapat ditutup dan terbuka saat memilih objek. Generator menampilkan kelengkapan sumber data sebelum membuat slide. File PDF/PPTX mempertahankan tampilan sebagai gambar; komponen PowerPoint tidak dapat diedit terpisah.
- Presentasi dapat diarsipkan dan dipulihkan. Tombol **Bagikan** mengaktifkan link viewer tanpa login untuk versi slide yang sudah ditinjau. Perubahan editor tampil setelah **Perbarui versi berbagi**. Cabut link kapan saja; arsip presentasi dan sampah survei juga mencabutnya.
- Beranda dengan starter template dan tabel survei; pencarian, duplikat, arsip, sampah dan pemulihan.
- Pengaturan nama dan foto profil privat, identitas workspace, penggunaan bulanan aktual dan impor Google Form JSON dengan preview serta catatan item yang tidak didukung.
- Pemulihan password melalui SMTP dan sambungan Google Forms API tersedia setelah konfigurasi pengelola. Sambungan Google hanya membaca instrumen, lalu memakai alur preview/import yang sama. Konfigurasi dan prasyarat ada di [panduan integrasi](docs/SURVEYDASH_INTEGRATIONS.md).
- Navigasi publik sticky dengan menu mobile dan kontak support `help@surveydash.id`.
- PostgreSQL untuk deployment Vercel; SQLite sebagai pilihan lokal tanpa layanan cloud.

## Cara mencoba satu alur lengkap

1. Buat survei dari template **Pengalaman layanan** atau **Form kosong**.
2. Atur pertanyaan; editor menyimpan otomatis dan menampilkan statusnya.
3. Pada tab **Form**, klik **Buka form**. Salin link dan isi dari tab baru.
4. Pada tab **Data**, muat ulang. Respons muncul sebagai baris baru. Aktifkan **Koreksi data** bila perlu; lihat riwayatnya.
5. Pada tab **Presentasi**, pilih **Buat dari analisis** atau **Presentasi kosong**. Atur teks/grafik/gambar, posisi dan ukuran pada editor slide.
6. Klik **Pratinjau** untuk menampilkan slide, gunakan panah, lalu Escape untuk keluar. **Ekspor** menyediakan PDF dan PowerPoint. **Template** menyimpan desain untuk digunakan kembali.
7. Ubah status menjadi **Tutup**, simpan, lalu buka lagi link form. Pengiriman jawaban baru akan ditolak oleh server.

## Fondasi arsitektur

```mermaid
flowchart LR
  A[Form builder admin] --> B[Definisi pertanyaan dengan ID tetap]
  B --> C[Form responden]
  C --> D[Route handler dan validasi]
  D --> E[(Database)]
  E --> F[Tabel respons dan audit koreksi]
  E --> G[Perhitungan survei]
  G --> H[Kanvas dan presentasi]
```

- `src/lib/model.ts`: validasi, distribusi, kebijakan form, dan perhitungan murni.
- `src/lib/repository.ts`: penyimpanan, ownership, revisi, transaksi, template, dan audit.
- `src/lib/db.ts`: koneksi PostgreSQL/SQLite, transaksi per koneksi, dan skema aplikasi.
- `src/lib/auth.ts`: konfigurasi Better Auth; tabel dikelola melalui migrasi library.
- `src/app/api/`: batas server untuk autentikasi, survei, respons, dan portal.
- `src/components/`: workspace, builder, tabel, grafik, dan presentasi.
- `tests/`: pengujian perhitungan, validasi, akses form, ownership, transaksi, dan konflik revisi.

Jawaban menyimpan snapshot pertanyaan. Label dan urutan pertanyaan tidak menjadi indeks data. Setelah respons terkumpul, perubahan jenis, pilihan, skor, atau penghapusan pertanyaan lama ditolak. Pertanyaan baru dan perubahan urutan/label tetap didukung. Buat survei baru untuk mengganti instrumen penelitian.

## Pemeriksaan

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Batas versi pertama

Versi online memakai PostgreSQL melalui Prisma Postgres di Vercel Marketplace. Produksi memakai `DATABASE_URL`. Preview wajib memakai `STAGING_DATABASE_URL` yang terpisah untuk seluruh data dan autentikasi. Deployment Vercel menolak fallback SQLite agar data tidak ditulis ke filesystem sementara.

Tabel berfokus pada jawaban survei. Formula Excel bebas, copy-paste banyak sel, conditional branching, impor respons Google Sheets, manajemen tim/admin/surveyor belum tersedia. Impor JSON saat ini hanya memindahkan instrumen Google Form. CSV, PDF dan PowerPoint sudah dapat diekspor. Penyegaran respons memakai tombol **Muat ulang**, bukan subscription realtime.

Pendaftaran workspace terbuka untuk pengujian. Verifikasi email, kebijakan undangan, dan manajemen tim belum tersedia. Pemulihan password memerlukan SMTP yang telah diuji; tanpa konfigurasi, UI menampilkan kontak support. Analisis menghitung respons di server saat dibutuhkan, tetapi masih membaca seluruh dataset di server. `TRUST_PROXY=true` dipakai pada deployment Vercel yang mengelola header alamat IP.

## Deployment cloud

Project Vercel **surveydash-studio** membangun folder `surveydash-next` pada repository SurveyDash. Database **surveydash-studio-db** menggunakan paket gratis Prisma Postgres di Singapura dan terpisah dari database aplikasi lain.

Branch production: `codex/surveydash-studio`. Push ke branch ini memicu deployment otomatis pada project Studio. Folder `surveydash-next` menyimpan aplikasi baru; root repository tetap berisi aplikasi sebelumnya.

Konfigurasi server: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, dan `TRUST_PROXY`. Rahasia disimpan di environment Vercel dan tidak masuk Git. Jangan menambahkan prefix `NEXT_PUBLIC_` pada kredensial database atau rahasia sesi.

Untuk migrasi awal, siapkan berkas environment cloud yang diabaikan Git, verifikasi project/team dan environment, lalu jalankan:

```powershell
node --env-file=.env.cloud.local --import tsx scripts/setup.ts
```

Migrasi membuat skema aplikasi dan tabel Better Auth. Migrasi tidak berjalan pada setiap request atau build. Setiap preview deployment mempercayai hostname deploymentnya sendiri; production memakai URL kanonis dari `BETTER_AUTH_URL`.

## Sumber open source dan desain

Referensi dipilih dari dokumentasi resmi dan repositori dengan lisensi MIT, MIT-0 dan Apache-2.0. Aplikasi disusun untuk kebutuhan SurveyDash; tidak menyalin seluruh template aplikasi pihak ketiga.

| Sumber                                                                                         | Pemakaian                                                                                     |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Next.js](https://github.com/vercel/next.js)                                                   | App Router, halaman server, dan route handlers                                                |
| [Better Auth](https://github.com/better-auth/better-auth)                                      | Autentikasi dan sesi di database aplikasi                                                     |
| [TanStack Table](https://github.com/TanStack/table)                                            | Tabel respons; versi 8 dipin sesuai API yang digunakan                                        |
| [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)                    | Grid presentasi v2, drag, resize, dan external drop                                           |
| [Recharts](https://github.com/recharts/recharts)                                               | Grafik analisis dan aktivitas; grafik kanvas memakai CSS native agar stabil saat resize/modal |
| [shadcn/ui](https://github.com/shadcn-ui/ui), [dashboard blocks](https://ui.shadcn.com/blocks) | Referensi komposisi workspace, sidebar, kartu, dan tabel                                      |
| [Radix Primitives](https://github.com/radix-ui/primitives)                                     | Dialog dengan pengelolaan fokus dan navigasi keyboard                                         |
| [dnd kit](https://github.com/clauderic/dnd-kit)                                                | Referensi riset reorder; versi ini memakai drag HTML dan tombol keyboard                      |

Lisensi masing-masing dependency tetap menjadi milik pengembangnya. Detail tersedia di paket yang diinstal dan berkas [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Dokumentasi rilis produk

Lihat [laporan implementasi](docs/SURVEYDASH_IMPLEMENTATION_REPORT.md), [audit master brief](docs/SURVEYDASH_MASTER_SPEC_AUDIT.md), [route map](docs/SURVEYDASH_ROUTE_MAP.md), [UI system](docs/SURVEYDASH_UI_SYSTEM.md), [arsitektur](docs/SURVEYDASH_ARCHITECTURE.md), [integrasi](docs/SURVEYDASH_INTEGRATIONS.md) dan [rilis/recovery](docs/SURVEYDASH_RELEASE.md). Revisi pada branch `codex/surveydash-revisions` belum dirilis ke production. SMTP/OAuth production masih membutuhkan konfigurasi eksternal; pembayaran belum diaktifkan.

## Admin dan akun client uji

Admin platform yang ditetapkan pengelola memiliki menu **Admin workspace** untuk memilih workspace. Akun login dan profil tetap milik admin tersebut. Banner mode admin menyediakan tombol kembali ke workspace sendiri. Akun client memiliki akses semua fitur pada workspace uji terpisah; data simulasi, template dan slide awal disiapkan tanpa menyalin jawaban produksi.
