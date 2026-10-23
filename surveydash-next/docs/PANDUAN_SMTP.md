# Mengaktifkan email SurveyDash

Pemulihan password dan verifikasi email sudah disiapkan dalam kode. Saat ini pengiriman produksi belum aktif karena layanan SMTP belum dipilih. Tidak perlu mengirim password atau API key lewat chat.

## 1. Siapkan pengirim

Pilih layanan email yang menyediakan SMTP dan verifikasi domain pengirim. Pengelola perlu akses DNS domain yang dipakai. Ikuti record SPF/DKIM dan verifikasi yang diberikan penyedia; jangan menebak isi record DNS.

Alamat publik yang disetujui adalah `help@surveydash.id`. Untuk memakai alamat itu sebagai pengirim, verifikasi domain/alamat tersebut dahulu. Untuk menerima balasan atau permintaan bantuan, buat dan uji inboxnya di layanan mailbox. Layanan pengiriman SMTP tidak selalu menyediakan inbox masuk.

Catat dari dashboard penyedia: host, port, username, password/API key SMTP, dan alamat pengirim yang sudah diverifikasi.

## 2. Isi konfigurasi Vercel

Buka project **surveydash-studio** di team **haikal-devtechs-projects**, lalu **Settings → Environment Variables**. Mulai dengan environment Preview untuk pengujian. Rahasia disimpan sebagai Secret dan tidak memakai awalan `NEXT_PUBLIC_`.

| Nama | Yang diisi |
| --- | --- |
| `SMTP_HOST` | Host SMTP dari penyedia, tanpa awalan `smtp://` |
| `SMTP_PORT` | `465` untuk TLS langsung atau `587` untuk STARTTLS, sesuai penyedia |
| `SMTP_USER` | Username SMTP dari penyedia |
| `SMTP_PASSWORD` | Password atau API key SMTP dari penyedia, simpan sebagai Secret |
| `SMTP_FROM` | Alamat pengirim terverifikasi, misalnya `help@surveydash.id`, tanpa nama tampilan |
| `SUPPORT_EMAIL` | `help@surveydash.id` |
| `PASSWORD_RECOVERY_ENABLED` | `false` selama persiapan |
| `EMAIL_VERIFICATION_ENABLED` | `false` selama persiapan |

Perubahan environment berlaku pada deployment berikutnya. Jangan mengubah `BETTER_AUTH_SECRET`, `SURVEYOR_DATA_SECRET`, atau kunci backup saat mengisi SMTP. Konfigurasi `SMTP_TEST_MODE` hanya untuk pengujian loopback lokal dan tidak digunakan pada Vercel.

## 3. Periksa koneksi tanpa mengirim email

Operator dapat memakai berkas environment privat yang diabaikan Git, misalnya `.env.smtp.local`, lalu menjalankan:

```powershell
node --env-file=.env.smtp.local --import tsx scripts/check-email.ts
```

Hasil `smtpConnectionAndAuthentication: true` berarti koneksi dan autentikasi SMTP lulus. Perintah ini tidak mengirim email dan belum membuktikan email masuk ke inbox. Output tidak menampilkan kredensial.

## 4. Uji pengiriman di Preview

Gunakan akun QA dan kotak email yang disetujui pemiliknya. Aktifkan `PASSWORD_RECOVERY_ENABLED=true` di Preview dan redeploy. Dari halaman login, pilih **Lupa kata sandi**, lalu periksa inbox/spam dan nama/alamat pengirim.

Uji bahwa link reset dapat dipakai sekali, kedaluwarsa setelah 30 menit, password lama gagal dan sesi lama dicabut. Untuk verifikasi email, aktifkan `EMAIL_VERIFICATION_ENABLED=true` di Preview dan redeploy, lalu gunakan **Kirim verifikasi email** pada Keamanan akun. Link verifikasi berlaku satu jam. Verifikasi email pada pendaftaran hanya dikirim ketika layanan siap dan flag aktif.

Jika koneksi/pengiriman gagal, periksa host, port, kredensial, verifikasi sender/DNS, batas penyedia dan log SMTP yang sudah disanitasi. Jangan menyalin URL reset, token, atau secret ke laporan publik.

## 5. Aktifkan produksi

Setelah pengujian Preview dan penerimaan email lulus, masukkan konfigurasi pengirim yang sesuai ke environment Production, aktifkan flag yang dipilih, lalu redeploy. Uji kembali memakai akun QA yang disetujui. Bila pengiriman gagal, kembalikan flag ke `false` dan redeploy sampai penyebabnya diperbaiki.

MFA authenticator yang tersedia di Keamanan akun dapat dipakai tanpa SMTP; pemilik akun menyelesaikan enrollment sendiri dan menyimpan kode cadangan. Responden tetap mengisi tanpa login atau verifikasi email.

Perilaku TLS/port mengikuti [dokumentasi SMTP Nodemailer](https://nodemailer.com/smtp). Runbook teknis dan pemulihan ada di [SURVEYDASH_AUDIT_RUNBOOK.md](SURVEYDASH_AUDIT_RUNBOOK.md).
