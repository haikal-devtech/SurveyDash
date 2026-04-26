# SurveyDash

SurveyDash adalah platform dashboard terpusat untuk pemaparan hasil Survei Kepuasan Masyarakat (SKM) secara interaktif, real-time, dan terintegrasi dengan Google Sheets via Google Apps Script (GAS).

## Panduan Integrasi Google Sheets ke SurveyDash

Untuk menampilkan data dari Google Forms (yang tersimpan di Google Sheets) ke SurveyDash, Anda perlu menggunakan Google Apps Script sebagai jembatan (API). Berikut adalah tutorial lengkapnya.

### Langkah 1: Persiapan Google Sheets
Pastikan Anda memiliki Spreadsheet hasil Google Form. Sebagai contoh, struktur kolom standar yang didukung script ini adalah:
* **Kolom C (Index 2):** Nama
* **Kolom D (Index 3):** Jenis Kelamin
* **Kolom G (Index 6):** Pendidikan Terakhir
* **Kolom K - S (Index 10-18):** 9 Indikator Kepuasan Masyarakat (IKM). Jawaban harus mengandung angka skor (misal: "b. Kurang Sesuai, 2").

*(Catatan: Anda dapat menyesuaikan indeks kolom pada script di bawah jika struktur sheet Anda berbeda. Indeks dimulai dari 0 untuk Kolom A).*

### Langkah 2: Memasukkan Kode Google Apps Script (Code.gs)
1. Buka Spreadsheet Anda.
2. Klik menu **Extensions (Ekstensi) > Apps Script**.
3. Hapus semua kode yang ada di editor, lalu paste kode berikut ini:

```javascript
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("input full"); // UBAH SESUAI NAMA SHEET ANDA
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // Mengabaikan baris pertama (header)

  // --- CONFIGURASI KOLOM (Indeks dimulai dari 0 = Kolom A) ---
  const COL_NAMA = 2;       // Kolom C: Nama
  const COL_GENDER = 3;     // Kolom D: Jenis Kelamin
  const COL_UMUR = 4;       // Kolom E: Umur
  const COL_PEKERJAAN = 5;  // Kolom F: Pekerjaan
  const COL_PENDIDIKAN = 6; // Kolom G: Pendidikan Terakhir
  const COL_SUKU = 7;       // Kolom H: Suku Etnis
  const COL_LAYANAN = 9;    // Kolom J: Jenis Layanan
  const START_INDIKATOR = 10; // Mulai dari Kolom K (Indikator 1) sampai S (Indikator 9)
  
  const labels = [
    "Persyaratan", "Sistem & Prosedur", "Waktu Pelayanan", 
    "Biaya/Tarif", "Produk Spesifikasi", "Kompetensi", 
    "Perilaku", "Sarana Prasarana", "Penanganan Pengaduan"
  ];

  // --- PENGOLAHAN DATA ---
  let totalNrrTertimbang = 0;
  let indicatorsData = labels.map((label, i) => ({
    id: i + 1,
    label: label,
    totalScore: 0,
    distribution: [0, 0, 0, 0], // [SK(1), K(2), B(3), SB(4)]
    avg: 0 // Menghindari error di frontend saat data masih kosong
  }));

  let demoStats = {
    gender: {},
    umur: {},
    pekerjaan: {},
    pendidikan: {},
    suku: {},
    layanan: {}
  };

  let respondentList = [];

  rows.forEach((row, rowIndex) => {
    // Lewati baris kosong
    if (!row[0]) return;

    // 1. Demografi
    let gender = row[COL_GENDER] || "Tidak Diketahui";
    let umur = row[COL_UMUR] || "Tidak Diketahui";
    let pekerjaan = row[COL_PEKERJAAN] || "Tidak Diketahui";
    let pendidikan = row[COL_PENDIDIKAN] || "Tidak Diketahui";
    let suku = row[COL_SUKU] || "Tidak Diketahui";
    let layanan = row[COL_LAYANAN] || "Tidak Diketahui";

    demoStats.gender[gender] = (demoStats.gender[gender] || 0) + 1;
    demoStats.umur[umur] = (demoStats.umur[umur] || 0) + 1;
    demoStats.pekerjaan[pekerjaan] = (demoStats.pekerjaan[pekerjaan] || 0) + 1;
    demoStats.pendidikan[pendidikan] = (demoStats.pendidikan[pendidikan] || 0) + 1;
    demoStats.suku[suku] = (demoStats.suku[suku] || 0) + 1;
    demoStats.layanan[layanan] = (demoStats.layanan[layanan] || 0) + 1;

    // 2. Indikator (Ambil angka dari jawaban, misal "Sangat Sesuai, 4" -> 4)
    let rowScores = {};
    for (let i = 0; i < 9; i++) {
      let cellValue = String(row[START_INDIKATOR + i]);
      // Ekstrak angka terakhir dari teks
      let scoreMatch = cellValue.match(/\d/g);
      let score = scoreMatch ? parseInt(scoreMatch.pop()) : 1; 
      
      // Batasi skor antara 1-4
      if (score < 1) score = 1;
      if (score > 4) score = 4;

      indicatorsData[i].totalScore += score;
      indicatorsData[i].distribution[score - 1]++;
      rowScores[labels[i]] = score;
    }

    // 3. Daftar Responden (semua data dikirim, paginasi ditangani di frontend)
    respondentList.push({
        id: "R" + (rowIndex + 1),
        name: row[COL_NAMA] || "Anonim",
        timestamp: row[0],
        gender: gender,
        education: pendidikan,
        answers: rowScores
      });
  });

  // --- KALKULASI AKHIR (PERMENPAN RB No. 14 Tahun 2017) ---
  // Hanya hitung baris yang valid (tidak kosong)
  const validRows = rows.filter(r => r[0]);
  const totalResp = validRows.length;
  
  let nilaiIndeks = 0; // Ini adalah Nilai Indeks (X) sebelum dikali 25
  
  if (totalResp > 0) {
    indicatorsData.forEach(ind => {
      // NRR = Jumlah Nilai Per Unsur / Total Unsur yang Terisi
      ind.avg = Number((ind.totalScore / totalResp).toFixed(2));
      
      // Nilai Indeks per unsur = NRR * Bobot (0.11)
      // Rumus: (a x 0,11) + (b x 0,11) + ... + (i x 0,11) = Nilai Indeks (X)
      nilaiIndeks += ind.avg * 0.11;
    });
  }

  // Nilai IKM Unit Pelayanan = Nilai Indeks (X) * 25
  const finalIkm = Number((nilaiIndeks * 25).toFixed(2));

  // Struktur JSON yang dibutuhkan oleh SurveyDash
  const result = {
    meta: {
      survey_name: "SKM BPBD Kota Tangerang Selatan", // Ubah sesuai nama survei
      period: "Tahun 2026",
      total_respondents: totalResp,
      last_updated: new Date().toISOString()
    },
    ikm: {
      score: finalIkm,
      nilaiIndeks: Number(nilaiIndeks.toFixed(4)),
      // Kategori berdasarkan NIK (Nilai Interval Konversi) — Permenpan RB 2017
      // A (Sangat Baik): 88,31 - 100,00
      // B (Baik)       : 76,61 - 88,30
      // C (Kurang Baik): 65,00 - 76,60
      // D (Tidak Baik) : 25,00 - 64,99
      category: finalIkm >= 88.31 ? "SANGAT BAIK" 
              : finalIkm >= 76.61 ? "BAIK" 
              : finalIkm >= 65.00 ? "KURANG BAIK" 
              : "TIDAK BAIK",
      label: finalIkm >= 88.31 ? "A" 
           : finalIkm >= 76.61 ? "B" 
           : finalIkm >= 65.00 ? "C" 
           : "D"
    },
    indicators: indicatorsData,
    demographics: demoStats,
    respondents: respondentList
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Langkah 3: Melakukan Deploy Web App
Setelah kode dimasukkan, Anda harus men-deploy-nya agar bisa diakses oleh SurveyDash:
1. Klik tombol **Save** (ikon disket) di bagian atas.
2. Klik tombol **Deploy** berwarna biru di pojok kanan atas, lalu pilih **New deployment**.
3. Di sebelah tulisan *Select type* (ikon roda gigi), pilih **Web app**.
4. Isi deskripsi (bebas, misalnya "v1.0").
5. Pastikan **Execute as** diatur ke: **Me (email@anda.com)**.
6. Sangat Penting! Atur **Who has access** ke: **Anyone**.
7. Klik **Deploy**.
8. Anda mungkin akan diminta memberikan izin akses (Authorize access). Lanjutkan dan berikan izin.
9. Setelah selesai, **Copy Web app URL** (alamat panjang yang diakhiri dengan `/exec`).

### Langkah 4: Memasukkan Web App URL ke SurveyDash
1. Login ke [SurveyDash](https://survey-dash-eight.vercel.app/) menggunakan akun Super Admin Anda.
2. Masuk ke halaman **Admin** (tombol Tambah Survei).
3. Di tab *Survei Aktif*, klik **Daftarkan Survei Baru**.
4. Isi Nama Survei, Instansi, dan Periode.
5. Paste **Web app URL** yang Anda salin dari Langkah 3 ke kolom **URL Script (Web App)**.
6. Klik Simpan.

Selamat! Survei Anda kini sudah tampil secara real-time di Dashboard.

---

## Menjalankan SurveyDash di Lokal

Jika Anda ingin menjalankan aplikasi web ini di komputer Anda:

1. Install dependencies:
   `npm install`
2. Atur konfigurasi Firebase di file `.env` (copy dari `.env.example`).
3. Jalankan aplikasi:
   `npm run dev`
