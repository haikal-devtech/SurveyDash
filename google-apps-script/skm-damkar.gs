/**
 * skm-damkar.gs — Google Apps Script untuk SurveyDash
 * Survei Kepuasan Masyarakat (SKM) Dinas Pemadam Kebakaran (DAMKAR)
 * Kota Tangerang Selatan
 * Indikator mengacu Permen PAN-RB RI No. 14 Tahun 2017 (9 unsur).
 *
 * ─── CARA DEPLOY ────────────────────────────────────────────────────────────────
 *   1. Buka spreadsheet hasil Google Form → Extensions → Apps Script
 *   2. Hapus semua kode lama, paste seluruh kode ini
 *   3. Save (Ctrl+S), lalu Deploy → New Deployment → Web App
 *        - Execute as     : Me
 *        - Who has access : Anyone
 *   4. Salin Web App URL (diakhiri /exec) → Admin SurveyDash → field "URL Script"
 *
 * ─── ENDPOINT ───────────────────────────────────────────────────────────────────
 *   GET  (tanpa param)            → data aktual dari sheet respons Form
 *   GET  ?mode=presentation       → data dari sheet "Presentasi" (fallback ke respons)
 *   GET  ?action=fillPresentation → salin sheet respons → "Presentasi"
 *   POST {action:"saveSettings", settings:{...}} → simpan ke sheet "survey_settings"
 *
 * ─── PENTING: VERIFIKASI INDEKS KOLOM ───────────────────────────────────────────
 *   Indeks kolom di bawah (COL_*) mengikuti URUTAN pertanyaan pada kuesioner DAMKAR,
 *   dengan kolom A = Timestamp otomatis Google Form (indeks 0). WAJIB cek header
 *   sheet respons Anda dan sesuaikan angka-angka di blok CFG bila urutan/isi form
 *   berbeda. Indeks dimulai dari 0 (Kolom A = 0, B = 1, C = 2, ...).
 *
 *   Urutan kolom yang diasumsikan:
 *     A(0)  Timestamp                         M(12) 1. Persyaratan
 *     B(1)  Tanggal Wawancara                 N(13) 2. Prosedur
 *     C(2)  Nama                              O(14) 3. Waktu
 *     D(3)  Jenis Kelamin                     P(15) 4. Biaya/Tarif
 *     E(4)  Usia                              Q(16) 5. Produk Layanan
 *     F(5)  Pekerjaan                         R(17) 6. Kompetensi
 *     G(6)  Pendidikan Terakhir               S(18) 7. Perilaku
 *     H(7)  Suku/Etnis                        T(19) 8. Pengaduan
 *     I(8)  Alamat                            U(20) 9. Sarana Prasarana
 *     J(9)  Nomor HP                          V(21) C1. Pendapat umum
 *     K(10) Kecamatan                         W(22) C2. Harapan publik
 *     L(11) Jenis Layanan yang diterima       X(23) Dokumentasi Survei
 *                                             Y(24) Surveyor
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURASI
// ═══════════════════════════════════════════════════════════════════════════════
const CFG = {
  // — Nama sheet —
  RESPONSE_SHEET:     'Form responses 1',   // sheet respons asli Google Form
  PRESENTATION_SHEET: 'Presentasi',         // subset untuk mode presentasi
  SETTINGS_SHEET:     'survey_settings',    // dibuat otomatis saat saveSettings

  // — Meta survei —
  SURVEY_NAME: 'SKM Dinas Pemadam Kebakaran (DAMKAR) Kota Tangerang Selatan',
  PERIOD:      'Tahun 2026',
  TARGET_RESPONDENTS: 400,

  // — Pemetaan kolom (indeks 0-based; Kolom A = 0) —
  COL_TANGGAL:     1,   // B: Tanggal Wawancara
  COL_NAMA:        2,   // C: Nama
  COL_GENDER:      3,   // D: Jenis Kelamin
  COL_UMUR:        4,   // E: Usia
  COL_PEKERJAAN:   5,   // F: Pekerjaan
  COL_PENDIDIKAN:  6,   // G: Pendidikan Terakhir
  COL_SUKU:        7,   // H: Suku/Etnis
  COL_ALAMAT:      8,   // I: Alamat
  COL_TELP:        9,   // J: Nomor HP
  COL_LOKASI:      10,  // K: Kecamatan (dipakai sebagai lokasi)
  COL_LAYANAN:     11,  // L: Jenis Layanan yang diterima
  START_INDIKATOR: 12,  // M–U: Indikator 1–9 (9 kolom berurutan)
  COL_OPINION:     21,  // V: C1. Pendapat umum
  COL_EXPECTATION: 22,  // W: C2. Harapan publik
  COL_DOKUMENTASI: 23,  // X: Dokumentasi Survei
  COL_SURVEYOR:    24,  // Y: Surveyor
};

// Label 9 unsur — URUTAN HARUS SAMA dengan urutan kolom indikator pada form.
const INDICATOR_LABELS = [
  'Persyaratan',                             // 1
  'Sistem, Mekanisme, dan Prosedur',         // 2
  'Waktu Penyelesaian',                      // 3
  'Biaya/Tarif',                             // 4
  'Produk Spesifikasi Jenis Pelayanan',      // 5
  'Kompetensi Pelaksana',                    // 6
  'Perilaku Pelaksana',                      // 7
  'Penanganan Pengaduan, Saran dan Masukan', // 8
  'Sarana dan Prasarana',                    // 9
];

// ═══════════════════════════════════════════════════════════════════════════════
// doGet — endpoint utama
// ═══════════════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || '';

    if (action === 'fillPresentation') {
      fillPresentationSheet_();
      return ok_('Sheet Presentasi telah diperbarui dari sheet respons.');
    }

    const usePresentation = params.mode === 'presentation';
    const payload = buildSurveyData_(usePresentation);
    return json_(payload);
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// doPost — simpan pengaturan dari Admin SurveyDash
// ═══════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents) : {};
    if (body.action === 'saveSettings') {
      saveSettings_(body.settings || {});
      return json_({ success: true, message: 'Pengaturan tersimpan.' });
    }
    return json_({ success: false, error: 'Aksi tidak dikenali: ' + body.action });
  } catch (err) {
    return json_({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENGOLAHAN DATA
// ═══════════════════════════════════════════════════════════════════════════════
function buildSurveyData_(usePresentation) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = null;
  if (usePresentation) sheet = ss.getSheetByName(CFG.PRESENTATION_SHEET);
  if (!sheet) sheet = ss.getSheetByName(CFG.RESPONSE_SHEET);
  if (!sheet) sheet = ss.getSheets()[0]; // fallback: sheet pertama

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // buang header

  const indicators = INDICATOR_LABELS.map((label, i) => ({
    id: i + 1,
    label: label,
    totalScore: 0,
    distribution: [0, 0, 0, 0], // [skor 1, 2, 3, 4]
    avg: 0,
  }));

  const demographics = {
    gender: {}, umur: {}, pekerjaan: {}, pendidikan: {},
    suku: {}, layanan: {}, location: {},
  };
  const openEnded = { general_opinion: [], expectations: [] };
  const respondents = [];

  const validRows = rows.filter(r => r[0]); // baris dengan timestamp

  validRows.forEach((row, idx) => {
    // 1. Demografi
    const gender     = val_(row, CFG.COL_GENDER);
    const umur       = val_(row, CFG.COL_UMUR);
    const pekerjaan  = val_(row, CFG.COL_PEKERJAAN);
    const pendidikan = val_(row, CFG.COL_PENDIDIKAN);
    const suku       = val_(row, CFG.COL_SUKU);
    const layanan    = val_(row, CFG.COL_LAYANAN);
    const lokasi     = CFG.COL_LOKASI >= 0 ? val_(row, CFG.COL_LOKASI) : 'Tidak Diketahui';

    bump_(demographics.gender, gender);
    bump_(demographics.umur, umur);
    bump_(demographics.pekerjaan, pekerjaan);
    bump_(demographics.pendidikan, pendidikan);
    bump_(demographics.suku, suku);
    bump_(demographics.layanan, layanan);
    bump_(demographics.location, lokasi);

    // 2. Skor indikator (9 unsur)
    const answers = {};
    for (let i = 0; i < 9; i++) {
      const score = parseScore_(row[CFG.START_INDIKATOR + i]);
      indicators[i].totalScore += score;
      indicators[i].distribution[score - 1]++;
      answers[INDICATOR_LABELS[i]] = score;
    }

    // 3. Pertanyaan terbuka
    const opinion = row[CFG.COL_OPINION];
    const expect  = row[CFG.COL_EXPECTATION];
    if (opinion) openEnded.general_opinion.push(String(opinion));
    if (expect)  openEnded.expectations.push(String(expect));

    // 4. Daftar responden
    respondents.push({
      id: 'R' + (idx + 1),
      name: row[CFG.COL_NAMA] || 'Anonim',
      timestamp: row[0],
      gender: gender,
      education: pendidikan,
      umur: umur,
      pekerjaan: pekerjaan,
      suku: suku,
      answers: answers,
      documentation: CFG.COL_DOKUMENTASI >= 0 ? (row[CFG.COL_DOKUMENTASI] || null) : null,
      surveyor: CFG.COL_SURVEYOR >= 0 ? (row[CFG.COL_SURVEYOR] || '-') : '-',
      location: lokasi,
    });
  });

  const total = validRows.length;
  let nilaiIndeks = 0;
  const bobot = 1 / 9; // 9 unsur berbobot sama
  if (total > 0) {
    indicators.forEach(ind => {
      ind.avg = Number((ind.totalScore / total).toFixed(2));
      nilaiIndeks += ind.avg * bobot;
    });
  }
  const ikmScore = Number((nilaiIndeks * 25).toFixed(2));

  return {
    meta: {
      survey_name: CFG.SURVEY_NAME,
      period: CFG.PERIOD,
      total_respondents: total,
      target_respondents: CFG.TARGET_RESPONDENTS,
      last_updated: new Date().toISOString(),
      survey_type: 'SKM',
    },
    // Selalu kirim objek ikm agar dashboard memakai layout SKM (bukan fallback
    // ELECTORAL) meski responden masih 0. Saat kosong, score = 0 (Mutu D).
    ikm: {
      score: ikmScore,
      nilaiIndeks: Number(nilaiIndeks.toFixed(4)),
      category: mutu_(ikmScore).category,
      label: mutu_(ikmScore).label,
    },
    indicators: indicators.map(ind => ({
      id: ind.id, label: ind.label, avg: ind.avg, distribution: ind.distribution,
    })),
    demographics: demographics,
    open_ended: openEnded,
    respondents: respondents,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function val_(row, idx) {
  if (idx < 0) return 'Tidak Diketahui';
  const v = row[idx];
  return (v === '' || v === null || v === undefined) ? 'Tidak Diketahui' : v;
}

function bump_(obj, key) {
  const k = String(key);
  obj[k] = (obj[k] || 0) + 1;
}

// Ambil skor 1–4 dari sel jawaban (mis. "b. Kurang Sesuai, 2" → 2).
function parseScore_(cell) {
  const digits = String(cell == null ? '' : cell).match(/[1-4]/g);
  let score = digits ? parseInt(digits[digits.length - 1], 10) : 1;
  if (score < 1) score = 1;
  if (score > 4) score = 4;
  return score;
}

// Konversi Indeks Kepuasan Masyarakat → mutu pelayanan (Permen PAN-RB 14/2017).
function mutu_(score) {
  if (score >= 88.31) return { label: 'A', category: 'SANGAT BAIK', interval: '88,31–100,00' };
  if (score >= 76.61) return { label: 'B', category: 'BAIK',        interval: '76,61–88,30' };
  if (score >= 65.00) return { label: 'C', category: 'KURANG BAIK', interval: '65,00–76,60' };
  return                      { label: 'D', category: 'TIDAK BAIK',  interval: '25,00–64,99' };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(message) {
  return json_({ success: true, message: message });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS & PRESENTASI
// ═══════════════════════════════════════════════════════════════════════════════
function saveSettings_(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.SETTINGS_SHEET);
  if (!sheet) sheet = ss.insertSheet(CFG.SETTINGS_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  const entries = Object.keys(settings).map(k => [k, JSON.stringify(settings[k])]);
  if (entries.length) sheet.getRange(2, 1, entries.length, 2).setValues(entries);
}

function fillPresentationSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(CFG.RESPONSE_SHEET);
  if (!src) throw new Error('Sheet respons "' + CFG.RESPONSE_SHEET + '" tidak ditemukan.');
  let dst = ss.getSheetByName(CFG.PRESENTATION_SHEET);
  if (!dst) dst = ss.insertSheet(CFG.PRESENTATION_SHEET);
  dst.clear();
  const values = src.getDataRange().getValues();
  dst.getRange(1, 1, values.length, values[0].length).setValues(values);
}
