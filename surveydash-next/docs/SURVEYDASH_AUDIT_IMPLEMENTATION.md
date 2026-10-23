# Pengerjaan audit — 23 Oktober 2026

Permintaan pengguna: kerjakan temuan dan rekomendasi audit, push GitHub dan rilis dengan QA visual menyusul. Basis awal `050ab28a886b354cfe2184df9620d4c069f62ed1`. Rilis utama sudah aktif di [SurveyDash Studio](https://surveydash-studio.vercel.app) melalui [PR #15](https://github.com/haikal-devtech/SurveyDash/pull/15), commit produksi `95057152631716be63e8bfee8bae5e08128fc110`. Workflow dipasang melalui [PR #16](https://github.com/haikal-devtech/SurveyDash/pull/16); portabilitas recovery diperkuat melalui [PR #17](https://github.com/haikal-devtech/SurveyDash/pull/17), commit `1ba0cc02f8e006045cb631b7a13003d33e292540`. Ketiga PR telah merged dan CI lulus. Sonar quality gate lulus untuk perubahan aplikasi/recovery.

## Implementasi

- Mutasi workspace membawa konteks halaman. Konteks hilang/berubah/dicabut ditolak 409, termasuk pembuatan survei, impor, template, upload dan pengaturan. API tetap memvalidasi keanggotaan. Halaman yang tidak diizinkan mengarahkan ke pintu masuk yang sesuai.
- Konflik survei/presentasi menyediakan unduhan draft dan ambil versi terbaru dengan konfirmasi membuang perubahan.
- Cleaning memiliki Diterima, Perlu verifikasi dan Dikeluarkan dengan alasan/audit. Dataset mentah/diterima konsisten pada analisis, tabel, CSV/XLSX, peta dan refresh presentasi. Koreksi membatalkan kelayakan review revisi lama tanpa menghapus data mentah.
- Blacklist workspace/platform menghentikan link dan penerimaan tugas pada cakupannya. Alasan/pelaku/waktu tercatat; pemulihan tidak otomatis mengaktifkan tugas lama. Reaktivasi mengganti token.
- Snapshot provinsi untuk respons baru mempertahankan wilayah historis; data lama tanpa bukti tetap belum terpetakan. Home province surveyor tetap terpisah dari wilayah tugas.
- Draft responden per tab, opt-in persistensi empat jam, pilihan lanjut/kosong, kunci retry stabil dan receipt. Bagian/halaman form, logika dari jawaban sebelumnya dan validasi server/client. Responden tetap tanpa login/tutorial.
- Peran pemilik/editor/pembaca/koordinator, pengaturan peran oleh pemilik/admin, UI pembaca, player presentasi baca saja dan guard backend. Koordinator dapat mengelola tugas/cleaning tanpa mengakses ekspor jawaban atau honor.
- Operasi lapangan: kota/kecamatan sebagai catatan manual, koordinator, target per tugas, kualitas respons, aktivitas terakhir, rekap CSV dan honor manual tanpa transfer. Tampilan HP memakai kartu. Pembaca tidak dapat dipilih sebagai koordinator.
- Filter tanggal WIB/provinsi snapshot/surveyor, tabulasi silang dua pertanyaan pilihan/skala, bobot manual beralasan/revision-bound dan jumlah mentah/berbobot. Tidak menciptakan margin of error atau keterwakilan otomatis.
- Dataset final immutable dari survei tertutup menyimpan pertanyaan, jawaban, atribusi, wilayah, bobot dan metode; tersedia CSV serta ringkasan versi final. Koreksi sumber tidak mengubah salinan/ringkasan.
- MFA authenticator dan kode cadangan untuk kedua peran; verifikasi email dan pemulihan bersyarat SMTP. Aktivasi MFA dilakukan pemilik akun, tanpa enrollment otomatis.
- PPTX editable memakai objek teks/bentuk/chart/tabel Office asli; ekspor raster lama dipertahankan.
- Analisis/presentasi keyset/batch; cleaning memakai indeks kemiripan privat bertahap 500 respons dan pagination SQL dengan progres. GET survei lama dibatasi 100 respons; metadata-only tetap tersedia.
- Pengumpulan PostgreSQL memakai shared definition lock saat kuota nonaktif, lock khusus kunci retry, serta exclusive lock untuk perubahan/penutupan. Jalur kuota tetap eksklusif.
- Error ID/rute statis/log tersanitasi, panel admin, health database dan ambang 20 kegagalan tak terduga/15 menit. Workflow health disiapkan setiap 15 menit.
- Backup streaming terenkripsi AES-GCM, restore batch dengan checksum seluruh tabel aplikasi/auth, migrasi berurutan dengan fingerprint target. Workflow backup harian dan pemulihan pada PostgreSQL sementara disiapkan.
- Retensi sampah manual (default 90 hari), purge owner/admin dengan konfirmasi judul/alasan/backup, proses permintaan data, privasi diperbarui dan riwayat tindakan termasuk undangan/target/penugasan.
- Dependency image-size/uuid diperbarui melalui override dan diuji; audit produksi menunjukkan nol advisory pada checkpoint ini. README/arsitektur/integrasi/runbook diselaraskan dengan fitur aktual.

## Bukti pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Unit/repository | 117 lulus, 0 gagal, termasuk pembandingan restore lintas representasi numerik dan penolakan kehilangan presisi |
| ESLint ketat | Lulus tanpa warning |
| Build produksi + TypeScript | Lulus; database lokal sudah dimigrasikan setelah backup lokal |
| HTTP lokal | 63 tim/admin + 106 alur/peta/artwork + 101 audit/MFA/roles/health = 270 pemeriksaan |
| MFA HTTP | Kedua peran, sesi tertahan sebelum faktor kedua, kode cadangan sekali pakai |
| PostgreSQL staging | Kualitas, cleaning SQL, bobot, peta snapshot, lapangan, presentasi, dataset final dan blokir lulus di schema terisolasi yang dihapus setelah tes |
| Konkuren PostgreSQL | 40 pengiriman sekitar 5,01 detik; 8 retry satu kunci menghasilkan satu respons; bukan SLA kapasitas nasional |
| Restore staging | Semua tabel aplikasi/auth dan 9.000 baris sintetis; checksum lulus, transaksi dibatalkan |
| Backup produksi terbaru | Terenkripsi; berhasil dipulihkan/diverifikasi dalam schema staging sementara, lalu rollback |
| Migrasi staging/produksi | Versi audit diterapkan; jumlah data inti tidak berkurang |
| Audit dependency produksi | 0 critical/high/moderate/low/info |
| HTTP produksi setelah rilis | 67 pemeriksaan lulus, memakai akun QA dan GET data bisnis; tidak mengubah respons pelanggan |
| Recovery lintas lingkungan | Backup produksi terenkripsi dan legacy dipulihkan di schema sementara dengan collation berbeda serta representasi bigint/double; seluruh fixture rollback |
| Health terjadwal | Aktif setiap 15 menit; run pertama berhasil |
| Backup offsite dan restore GitHub | [Run 39927073628 berhasil](https://github.com/haikal-devtech/SurveyDash/actions/runs/39927073628): enkripsi, artefak terenkripsi, setup PostgreSQL sementara, readback seluruh baris dan verifikasi sebelum commit |

Hasil mentah/fixture berada dalam `test-results/` yang diabaikan Git. DSN, secret, rekening, jawaban dan file backup tidak disertakan dalam laporan. Benchmark 20.000/100.000 respons dan batasnya ada di [runbook](SURVEYDASH_AUDIT_RUNBOOK.md).

## Batas dan ketergantungan operasional

- SMTP produksi belum tersedia sesuai konfirmasi pengguna. [Panduan konfigurasi berbahasa Indonesia](PANDUAN_SMTP.md) sudah disiapkan. Pengiriman/pemulihan/verifikasi email belum aktif. Tidak ada layanan dibeli atau email dikirim ke pihak lain.
- Secret backup disimpan terenkripsi di GitHub Actions; workflow default branch serta flag backup harian dan health 15 menit sudah aktif. Snapshot terenkripsi tersimpan offsite dan run restore setelah perbaikan berhasil. Run restore pertama menemukan perbedaan antarlingkungan dan menghasilkan perbaikan teruji pada PR #17. Sumber sementara memakai DSN produksi yang ada dengan transaksi read-only; role penyedia yang benar-benar read-only tetap direkomendasikan. Repository publik: artefak hanya ciphertext AES-GCM, dengan kunci terpisah dalam Actions Secrets dan recovery copy lokal privat.
- Enkripsi rekening mempertahankan kunci efektif yang sudah digunakan. Jangan merotasi auth/data key tanpa migrasi yang diuji. Konfigurasi key khusus dan recovery copy harus dijaga operator; tidak ada penggantian kunci sepihak.
- Notifikasi kegagalan workflow bergantung pengaturan GitHub pengguna; pengiriman alert belum diverifikasi. PITR/backup penyedia memiliki pengaturan tersendiri.
- Browser automation ditolak oleh pemeriksaan izin otomatis tersimpan. Tidak dicoba CUA/Playwright/CDP/headless/DOM emulator pengganti. QA visual HP/desktop, fokus/keyboard/tutorial, penyimpanan draft dan interaksi download belum lulus secara langsung.
- PPTX editable diverifikasi secara struktur arsip/objek, belum dirender dalam Office. Perbedaan font/layout mungkin terjadi.
- Indeks cleaning pertama 100.000 respons sekitar 129 detik lokal; UI memberi progres, belum ada SLA nasional. Definisikan ukuran instrumen/puncak konkuren dan lakukan pilot sebelum klaim kapasitas nasional.
- Wilayah rinci masih catatan manual; bukan katalog resmi. Pembatasan anggota pengelola per survei dan undangan email-bound/persetujuan khusus tetap opsi kebijakan bila tim memerlukannya. Undangan workspace standar tetap link tujuh hari.
