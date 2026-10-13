# Verifikasi SurveyDash Studio

Diperiksa pada 14 Oktober 2026 (WIB), dengan Node.js 24.19 dan Next.js 16.4.

Alur yang diuji: admin membuat survei dan mengatur pertanyaan → responden mengisi form website → jawaban tersimpan → admin melihat/mengoreksi tabel → analisis dan presentasi memakai data tersebut.

| Batas alur                 | Hasil                   | Bukti                                                                                                 |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Login → workspace          | Lolos                   | Akun lokal masuk melalui UI; workspace memuat survei dan data simulasi                                |
| Buat survei → repository   | Lolos                   | Survei baru dibuat melalui dialog template pengalaman layanan                                         |
| Edit instrumen → preview   | Lolos                   | Label nama diganti dan urutan pertanyaan dipindah; preview mengikuti perubahan                        |
| Buka form → form responden | Lolos                   | Admin membuka form; URL `/f/<token>` memuat instrumen yang disimpan                                   |
| Form → API → database      | Lolos                   | Respons contoh terkirim dan halaman menampilkan konfirmasi tersimpan                                  |
| Database → tabel           | Lolos                   | Muat ulang tabel menampilkan satu respons baru dengan seluruh jawaban                                 |
| Koreksi tabel → audit      | Lolos                   | Nama dikoreksi melalui sel; revision meningkat dan nilai sebelum/sesudah tercatat                     |
| Template pribadi           | Lolos                   | Form disimpan melalui dialog template; endpoint template dan pemakaiannya juga diuji                  |
| Tutup form → responden     | Lolos                   | Penutupan oleh admin membuat link form menampilkan “Survei sudah ditutup”                             |
| Visibilitas / ownership    | Lolos                   | Pengujian HTTP menolak akses workspace lain; link saja tidak masuk portal; privat tidak dapat diakses |
| Pertanyaan → grafik kanvas | Lolos                   | Pertanyaan Kecamatan diseret ke kanvas dan menghasilkan grafik; pie/bar dapat diganti                 |
| Resize → simpan layout     | Lolos                   | Kartu angka diperbesar lewat handle; ukuran berubah, lalu layout disimpan                             |
| Persistensi layout         | Lolos                   | Membuka ulang survei memuat komponen Kecamatan dan jenis grafik tersimpan                             |
| Mode presentasi            | Lolos setelah perbaikan | Mode presentasi tetap tampil setelah pemeriksaan; screenshot tersimpan di `presentation-preview.jpg`  |

## Pemeriksaan otomatis

- `pnpm typecheck`: lolos.
- `pnpm test`: 7 pengujian lolos. Meliputi IKM, jawaban kosong, validasi pilihan/checkbox/angka, kontrol form, kompatibilitas instrumen, CSV, transaksi, audit, dan konflik revision.
- `node tests/http-smoke.mjs`: lolos. Meliputi sesi, ownership, respons valid/tidak valid, deduplikasi pengiriman, koreksi, audit, status/visibilitas, template, dan origin permintaan.
- `pnpm build`: build terakhir berhasil tanpa peringatan.

## Perbaikan dari pengujian browser

Pemeriksaan menemukan loop render Recharts ketika beberapa grafik kanvas dipasang dalam modal presentasi. Grafik kanvas diganti dengan representasi CSS dari agregat jawaban yang sama. Recharts tetap digunakan untuk grafik ringkasan dan analisis. Mode presentasi kemudian dibuka ulang, diperiksa tetap stabil, dan diambil screenshot-nya.

`localhost` dan `127.0.0.1` dinormalisasi sebagai origin lokal yang dikonfigurasi. Permintaan dari origin lain atau tanpa origin tetap ditolak. Dialog template dan presentasi memakai Radix untuk pengelolaan fokus dan keyboard.

## Batas verifikasi

Pemeriksaan dilakukan pada aplikasi lokal dan data simulasi. Hosting produksi, PostgreSQL/Supabase, email nyata, impor Google Sheets, backup, manajemen tim, dan ekspor slide multi-halaman belum dikonfigurasi atau diuji. Cetak/PDF menggunakan fasilitas browser; hasil cetak belum diaudit sebagai dokumen laporan final.
