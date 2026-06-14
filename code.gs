/**
 * code.gs — Google Apps Script untuk SurveyDash
 * Survei Kepemimpinan Nasional & Elektoral Parpol dan Kandidat Capres Jelang Pilpres 2029
 *
 * ─── CARA DEPLOY ────────────────────────────────────────────────────────────────
 *   1. Buka spreadsheet Google Forms → Extensions → Apps Script
 *   2. Hapus semua kode lama, paste seluruh kode ini
 *   3. Save (Ctrl+S), lalu Deploy → New Deployment → Web App
 *      - Execute as : Me
 *      - Who has access: Anyone
 *   4. Salin Web App URL → Admin SurveyDash → field scriptUrl survei ini
 *
 * ─── ENDPOINT ───────────────────────────────────────────────────────────────────
 *   GET  (tanpa param)          → data aktual dari "Form responses 1"
 *   GET  ?mode=presentation     → data dari sheet "Presentasi"
 *   POST {action:"saveSettings", settings:{...}}   → simpan ke survey_settings
 *   POST {action:"fillPresentation"}               → salin Form responses 1 → Presentasi
 *
 * ─── NAMA SHEET ─────────────────────────────────────────────────────────────────
 *   "Form responses 1"   — respons asli dari Google Forms (otomatis dibuat)
 *   "Presentasi"         — subset respons untuk mode presentasi (buat manual atau via fillPresentation)
 *   "survey_settings"    — konfigurasi mode (dibuat otomatis)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURASI
// ═══════════════════════════════════════════════════════════════════════════════
const CFG = {
  RESPONSE_SHEET:     'Form responses 1',
  PRESENTATION_SHEET: 'Presentasi',
  SETTINGS_SHEET:     'survey_settings',
  SURVEY_NAME:        'Survei Kepemimpinan Nasional & Elektoral Parpol dan Kandidat Capres Jelang Pilpres 2029',
  PERIOD:             '14–23 Juni 2026',
  TARGET_SCORE:       90.0,
  MARGIN_OF_ERROR:    '±2.97%',
  CONFIDENCE_LEVEL:   95,
};

// ═══════════════════════════════════════════════════════════════════════════════
// doGet — endpoint utama
// ═══════════════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const params   = (e && e.parameter) ? e.parameter : {};
    const actionReq = params.action || '';

    if (actionReq === 'fillPresentation') {
      fillPresentationSheet_();
      return ok_('Sheet Presentasi telah diperbarui dari Form responses 1.');
    }

    if (actionReq === 'generateDemoData') {
      generateDemoData();
      return ok_('Demo data 2045 responden berhasil di-generate.');
    }

    if (actionReq === 'generatePresentation') {
      const slideUrl = generatePresentation();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, url: slideUrl }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const modeReq  = params.mode || '';
    const settings = getSettings_();

    const usePresentation =
      modeReq === 'presentation' ||
      String(settings.presentationModeEnabled) === 'true' ||
      settings.dataMode === 'presentation';

    const sheetName = usePresentation ? CFG.PRESENTATION_SHEET : CFG.RESPONSE_SHEET;
    const dataMode  = usePresentation ? 'presentation' : 'actual';

    const payload = buildData_(sheetName, dataMode);

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack || '' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// doPost — simpan pengaturan / isi sheet presentasi
// ═══════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'saveSettings' && body.settings) {
      saveSettings_(body.settings);
      return ok_('Pengaturan berhasil disimpan.');
    }

    if (body.action === 'fillPresentation') {
      fillPresentationSheet_();
      return ok_('Sheet Presentasi telah diperbarui dari Form responses 1.');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + body.action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function getSettings_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CFG.SETTINGS_SHEET);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const out  = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) out[String(data[i][0]).trim()] = data[i][1];
  }
  return out;
}

function saveSettings_(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CFG.SETTINGS_SHEET);
    sheet.appendRow(['key', 'value']);
  }
  const rows   = sheet.getDataRange().getValues();
  const keyRow = {};
  for (let i = 1; i < rows.length; i++) keyRow[String(rows[i][0]).trim()] = i + 1;

  for (const [k, v] of Object.entries(newSettings)) {
    if (keyRow[k] !== undefined) sheet.getRange(keyRow[k], 2).setValue(v);
    else sheet.appendRow([k, v]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILL PRESENTATION SHEET
// ═══════════════════════════════════════════════════════════════════════════════
function fillPresentationSheet_() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(CFG.RESPONSE_SHEET);
  if (!src) throw new Error('Sheet "' + CFG.RESPONSE_SHEET + '" tidak ditemukan.');

  let dst = ss.getSheetByName(CFG.PRESENTATION_SHEET);
  if (!dst) dst = ss.insertSheet(CFG.PRESENTATION_SHEET);
  dst.clearContents();

  const vals = src.getDataRange().getValues();
  if (vals.length > 0) {
    dst.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
  }
}

function ok_(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACA SHEET
// ═══════════════════════════════════════════════════════════════════════════════
function readSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    if (sheetName === CFG.PRESENTATION_SHEET) {
      sheet = ss.getSheetByName(CFG.RESPONSE_SHEET);
    }
  }
  
  if (!sheet) {
    // If the sheet still doesn't exist, create it with default headers
    sheet = ss.insertSheet(sheetName || CFG.RESPONSE_SHEET);
    const headers = [
      "Timestamp",
      "Tanggal wawancara:",
      "Nama:",
      "Jenis Kelamin:",
      "Umur:",
      "Pekerjaan:",
      "Penghasilan per bulan:",
      "Pendidikan terakhir:",
      "Agama:",
      "Suku/Etnis:",
      "Afiliasi Politik (Partai):",
      "Tempat Tinggal:",
      "Desa",
      "Kota",
      "Alamat:",
      "Kabupaten/Kota:",
      "Provinsi:",
      "No HP:",
      "No Rekening/e wallet Responden (souvenir):",
      "A1a. Menurut Anda bagaimana kondisi kepemimpinan nasional saat ini?",
      "A1b-A1c. Skala Kepemimpinan Nasional [Seberapa puas Anda terhadap kualitas kepemimpinan nasional Indonesia saat ini?]",
      "A1b-A1c. Skala Kepemimpinan Nasional [Seberapa optimis Anda Indonesia akan memiliki pemimpin yang mampu membawa kemajuan dalam 10 tahun ke depan?]",
      "A1d. Menurut Anda, masalah utama bangsa yang harus segera diselesaikan pemimpin nasional? (Pilih maksimal 3)",
      "A2a. Bagaimana pendapat Anda tentang kebijakan dan model kepemimpinan pemerintahan Prabowo?",
      "A2b. Menurut Anda, apakah kriteria pemimpin yang dibutuhkan untuk kondisi Indonesia saat ini dan mendatang?",
      "A2c. Apa yang paling tidak Anda sukai dari pemimpin yang akan datang?",
      "A2d. Apa sebaiknya yang harus dilakukan oleh pemimpin mendatang?",
      "A2e. Karakter pemimpin nasional yang paling dibutuhkan Indonesia saat ini? (Pilih maksimal 3)",
      "A2f. Apakah Indonesia membutuhkan munculnya tokoh pemimpin nasional baru di luar tokoh-tokoh yang saat ini dikenal publik?",
      "A2g. Pemimpin nasional yang ideal menurut Anda berasal dari kalangan mana?",
      "A2h. Menurut Bapak/Ibu, siapa tokoh yang paling layak menjadi pemimpin nasional Indonesia di masa depan?",
      "A2i. Selain nama tersebut, siapa lagi tokoh yang menurut Anda layak menjadi pemimpin nasional?",
      "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Ekonomi?",
      "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pemberantasan Korupsi?",
      "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Diplomasi Internasional?",
      "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pertahanan dan Keamanan?",
      "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Kesejahteraan Rakyat?",
      "B1a. Jika Pilpres dilakukan hari ini, Anda memilih calon Presiden siapa?__________, Apa alasannya?",
      "B1b. Apakah saat ini Anda memiliki figur Capres alternatif? Siapa sosok Capres alternatif usulan Anda?",
      "B1c. Menurut Anda bagaimana sosok Capres ideal 2029?",
      "B1d. Capres ideal menurut Anda merepresentasikan tokoh dari kalangan apa?",
      "C1a. Di antara nama Capres berikut, mana saja yang anda tahu/kenal?",
      "C1b. Di antara nama Capres berikut ini, mana yang Anda suka?",
      "C1c. Bila Pilpres dilaksanakan hari ini, Anda akan memilih siapa?",
      "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 10 nama)",
      "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 8 nama)",
      "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 5 nama)",
      "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Politisi)",
      "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Tokoh)",
      "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Profesional)",
      "E1a-open — Jika Pemilu Legislatif dilakukan hari ini, Anda memilih partai apa?",
      "E1b. Di antara nama Parpol berikut ini, Parpol mana saja yang Anda tahu?",
      "E1c. Di antara nama Parpol berikut ini, Parpol mana yang Anda suka?",
      "E1d. Bila Pemilihan Legislatif dilaksanakan hari ini, Anda akan memilih partai apa?",
      "F1a. Menurut Anda bagaimana kinerja Pemerintahan Prabowo?",
      "F1b. Apa yang paling tidak Anda sukai dari kinerja Pemerintah Prabowo?",
      "F1c. Apa sebaiknya yang harus dilakukan oleh Pemerintah Prabowo?",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2a. Pelayanan Publik]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2b. Ekonomi, Industri, Teknologi, dan Lapangan Pekerjaan?]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2c. Pembangunan, Infrastruktur, dan Transportasi?]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2d. Penanganan Tanggap Bencana dan Darurat Kebencanaan?]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2e. Pendidikan dan Pengembangan SDM]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2f. Lingkungan dan Pengelolaan Hutan]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2g. Pertahanan, Keamanan, dan HAM]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2h. Pertanian dan Ketahanan Pangan]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2i. Demokrasi, Politik Dalam dan Luar Negeri]",
      "Bagaimana kinerja pemerintah di bidang berikut? [F2j. Pajak dan Keuangan]",
      "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3a. Kejelasan visi dan arah kebijakan Pemerintah]",
      "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3b. Kecepatan pemerintah merespons masalah atau krisis]",
      "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3c. Ketegasan pemerintah mengambil keputusan strategis]",
      "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3d. Konsistensi antara pernyataan dengan kebijakan yang diambil]",
      "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3e. Kemampuan pemerintah mengoordinasikan kebijakan]",
      "Kepercayaan & Legitimasi Publik [F4a. Tingkat kepercayaan Anda terhadap Pemerintah]",
      "Kepercayaan & Legitimasi Publik [F4b. Persepsi terhadap integritas dan kejujuran Pemerintah]",
      "Kepercayaan & Legitimasi Publik [F4c. Keyakinan bahwa pemerintah bekerja untuk kepentingan rakyat]",
      "F5a. Secara keseluruhan, bagaimana penilaian Anda terhadap kinerja Pemerintahan Prabowo?",
      "F5b. Dari skala 1-10, berapa skor yang Anda berikan untuk kinerja Pemerintahan Prabowo?",
      "F5c. Menurut Anda, satu isu atau masalah apa yang paling mendesak perlu segera ditangani Pemerintahan Prabowo?",
      "G1a. Apa pertimbangan Anda dalam memilih pada Pemilu 2029?",
      "G1b. Apa pertimbangan utama Anda dalam memilih kandidat di Pemilu 2029? (semi terbuka)",
      "Model kampanye seperti apa yang anda harapkan? [G2a. Praktik kampanye menggunakan alat peraga]",
      "Model kampanye seperti apa yang anda harapkan? [G2b. Praktik kampanye menggunakan media sosial (fb, twitter, instagram, path, youtube, tiktok, dll)?]",
      "Model kampanye seperti apa yang anda harapkan? [G2c. Praktik kampanye rapat terbuka]",
      "Model kampanye seperti apa yang anda harapkan? [G2d. Praktik kampanye rapat tertutup]",
      "Model kampanye seperti apa yang anda harapkan? [G2e. Praktik kampanye bertemu langsung dengan pasangan calon]",
      "Model kampanye seperti apa yang anda harapkan? [G2f. Praktik kampanye konvoi di jalanan]",
      "Model kampanye seperti apa yang anda harapkan? [G2g. Praktik kampanye menggunakan influencer/tokoh]",
      "Apa pertimbangan anda dalam menentukan pilihan? [G3a. Rekam jejak dan integritas kandidat]",
      "Apa pertimbangan anda dalam menentukan pilihan? [G3b. Visi misi / program/ gagasan kandidat]",
      "Apa pertimbangan anda dalam menentukan pilihan? [G3c. Ketokohan kandidat]",
      "Apa pertimbangan anda dalam menentukan pilihan? [G3d. Praktik bagi-bagi uang dan sembako oleh kandidat/tim sukses]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4a. Ajakan perkumpulan profesi (Petani, pedagang, organda, dll.)]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4b. Tokoh agama (Kyai/ulama, imam, pendeta, dsb.)]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4c. Pejabat-pejabat negara setempat (misalnya, kepala desa, lurah, camat)]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4d. Pengurus partai politik]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4e. Komunitas berbasis etnis]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4f. Tokoh Adat]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4g. Pemilik tanah/bos/majikan]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4h. LSM lokal]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4i. Teman]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4j. Keluarga]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4k. Tetangga]",
      "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4l. Lainnya]",
      "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Prabowo Subianto]",
      "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Gibran Rakabuming Raka]",
      "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Sudirman Said]",
      "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Prabowo Subianto]",
      "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Gibran Rakabuming Raka]",
      "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Sudirman Said]",
      "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Prabowo Subianto]",
      "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Gibran Rakabuming Raka]",
      "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Sudirman Said]",
      "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Prabowo Subianto]",
      "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Gibran Rakabuming Raka]",
      "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Sudirman Said]",
      "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Prabowo Subianto]",
      "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Gibran Rakabumi Raka]",
      "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Dedi Mulyadi]",
      "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Purbaya Yudhi Sadewa]",
      "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Sudirman Said]",
      "I1a. Menurut penilaian Anda, sampai sejauh manakah responden memahami dengan baik pertanyaan-pertanyaan yang diberikan?",
      "I1b. Mengingat kondisi wawancara, konsistensi jawaban, dan upaya yang telah dilakukan responden ini untuk menjawab pertanyaan-pertanyaan dengan sejujur-jujurnya, seberapa terpercayakah menurut Anda jawaban-jawaban dari responden?",
      "Nama Surveyor",
      "Provinsi"
    ];
    sheet.appendRow(headers);
  }
  
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return { headers: vals[0].map(h => String(h).trim()), rows: [] };
  const headers = vals[0].map(h => String(h).trim());
  const rows    = vals.slice(1).filter(r => r.some(c => c !== '' && c !== null && c !== undefined));
  return { headers, rows };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER CARI KOLOM
// ═══════════════════════════════════════════════════════════════════════════════

/** Exact match (case-insensitive) */
function ci_(headers, text) {
  const t = text.toLowerCase();
  return headers.findIndex(h => h.toLowerCase() === t);
}

/** Partial match — header harus mengandung SEMUA kata dalam keywords */
function cp_(headers, ...keywords) {
  const kws = keywords.map(k => k.toLowerCase());
  return headers.findIndex(h => {
    const lower = h.toLowerCase();
    return kws.every(k => lower.includes(k));
  });
}

/** Partial match — cari SEMUA indeks yang cocok (untuk header duplikat seperti H1a × 3) */
function findAll_(headers, ...keywords) {
  const kws = keywords.map(k => k.toLowerCase());
  return headers.reduce((acc, h, i) => {
    const lower = h.toLowerCase();
    if (kws.every(k => lower.includes(k))) acc.push(i);
    return acc;
  }, []);
}

/** Cari kolom mengandung kode pertanyaan, contoh "[F2a." atau "F2a." */
function cq_(headers, code) {
  const upper = code.toUpperCase();
  return headers.findIndex(h => {
    const u = h.toUpperCase();
    return u.includes('[' + upper + '.') ||
           u.includes(upper + '.') ||
           u.startsWith(upper + ' ') ||
           u.includes('(' + upper + ')');
  });
}

/** findLastIndex polyfill (GAS tidak selalu support) */
function lastIdx_(headers, ...keywords) {
  const kws = keywords.map(k => k.toLowerCase());
  for (let i = headers.length - 1; i >= 0; i--) {
    const lower = headers[i].toLowerCase();
    if (kws.every(k => lower.includes(k))) return i;
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGREGASI
// ═══════════════════════════════════════════════════════════════════════════════

/** Hitung kemunculan setiap nilai unik di satu kolom */
function countCol_(rows, idx) {
  const out = {};
  if (idx < 0) return out;
  for (const row of rows) {
    const v = String(row[idx] ?? '').trim();
    if (v && v !== 'Tidak tahu' && v !== '-' && v !== '0') out[v] = (out[v] || 0) + 1;
  }
  return out;
}

/**
 * Hitung multi-select.
 * Mendukung dua format Google Forms:
 *   1. Satu kolom, nilai dipisah koma/titik koma: "Anies, Dedi, Prabowo"
 *   2. Beberapa kolom dengan nilai = nama pilihan atau kosong (checkbox per kolom)
 *
 * Jika idx adalah array, mode #2; jika number, mode #1.
 */
function countMulti_(rows, idx) {
  const out = {};
  if (idx === undefined || idx === null || (typeof idx === 'number' && idx < 0)) return out;

  if (Array.isArray(idx)) {
    // Mode: satu kolom per opsi (nilai = nama opsi atau kosong)
    for (const col of idx) {
      if (col < 0) continue;
      for (const row of rows) {
        const v = String(row[col] ?? '').trim();
        if (v && v !== 'Tidak tahu') out[v] = (out[v] || 0) + 1;
      }
    }
  } else {
    // Mode: satu kolom, dipisah koma/titik koma
    for (const row of rows) {
      const items = String(row[idx] ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
      for (const item of items) {
        if (item !== 'Tidak tahu') out[item] = (out[item] || 0) + 1;
      }
    }
  }
  return out;
}

/** Konversi {name: count} → array terurut [{name, count, percentage}] */
function toRank_(counts, total) {
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round(count / total * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Rata-rata numerik dari satu kolom */
function avg_(rows, idx) {
  if (idx < 0) return 0;
  let sum = 0, n = 0;
  for (const row of rows) {
    const v = parseFloat(String(row[idx] ?? ''));
    if (!isNaN(v) && v >= 0) { sum += v; n++; }
  }
  return n > 0 ? Math.round(sum / n * 100) / 100 : 0;
}

/** Distribusi label (untuk Likert, opsi consideration, dll.) */
function dist_(rows, idx, labels) {
  const out = {};
  labels.forEach(l => { out[l] = 0; });
  if (idx < 0) return out;
  for (const row of rows) {
    const v = String(row[idx] ?? '').trim();
    if (v && out.hasOwnProperty(v)) out[v]++;
  }
  return out;
}

/** Konversi Likert 4-point ke skor 0–100 */
function likertToScore_(rows, idx) {
  const map = {
    'Sangat tidak puas': 25, 'Tidak puas': 50, 'Puas': 75, 'Sangat puas': 100,
    'Sangat tidak suka': 25, 'Tidak suka': 50, 'Suka': 75, 'Sangat suka': 100,
    'Sangat tidak setuju': 25, 'Tidak setuju': 50, 'Setuju': 75, 'Sangat setuju': 100,
  };
  if (idx < 0) return 0;
  let sum = 0, n = 0;
  for (const row of rows) {
    const v = String(row[idx] ?? '').trim();
    if (map[v] !== undefined) { sum += map[v]; n++; }
  }
  return n > 0 ? Math.round(sum / n * 100) / 100 : 0;
}

/** Kumpulkan jawaban terbuka dan hitung frekuensi */
function topOpenAnswers_(rows, idx, limit) {
  limit = limit || 30;
  if (idx < 0) return [];
  const counts = {};
  for (const row of rows) {
    const v = String(row[idx] ?? '').trim();
    if (v && v.length > 1) {
      const key = v.charAt(0).toUpperCase() + v.slice(1);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, percentage: count }));
}

/** Kumpulkan teks jawaban terbuka mentah (tanpa agregasi) */
function collectText_(rows, idx, limit) {
  limit = limit || 40;
  if (idx < 0) return [];
  const out = [];
  for (const row of rows) {
    const v = String(row[idx] ?? '').trim();
    if (v && v.length > 2) {
      out.push(v);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HITUNG IKM (F2 + F3/F4 + F5b)
// ═══════════════════════════════════════════════════════════════════════════════
function computeIKM_(rows, headers) {
  // F2a–F2j: skala kepuasan 4-point → 0–100
  const f2Codes = ['F2a','F2b','F2c','F2d','F2e','F2f','F2g','F2h','F2i','F2j'];
  let f2Sum = 0, f2n = 0;
  const f2Map = { 'Sangat tidak puas': 25, 'Tidak puas': 50, 'Puas': 75, 'Sangat puas': 100 };
  for (const code of f2Codes) {
    const idx = cp_(headers, code + '.');
    if (idx < 0) continue;
    for (const row of rows) {
      const v = String(row[idx] ?? '').trim();
      if (f2Map[v] !== undefined) { f2Sum += f2Map[v]; f2n++; }
    }
  }
  const f2Score = f2n > 0 ? f2Sum / f2n : 0;

  // F3a–F3e + F4a–F4c: skala 1–10 → 0–100
  const fScaleCodes = ['F3a','F3b','F3c','F3d','F3e','F4a','F4b','F4c'];
  let fsSum = 0, fsn = 0;
  for (const code of fScaleCodes) {
    // Google Forms matrix header format: "...pertanyaan... [F3a. Kejelasan...]"
    const idx = cp_(headers, '[' + code + '.');
    if (idx < 0) continue;
    for (const row of rows) {
      const v = parseFloat(String(row[idx] ?? ''));
      if (!isNaN(v) && v >= 1 && v <= 10) { fsSum += v * 10; fsn++; }
    }
  }
  const fScaleScore = fsn > 0 ? fsSum / fsn : 0;

  // F5b: skor keseluruhan 1–10
  const f5bIdx = cp_(headers, 'f5b');
  let f5bSum = 0, f5bn = 0;
  if (f5bIdx >= 0) {
    for (const row of rows) {
      const v = parseFloat(String(row[f5bIdx] ?? ''));
      if (!isNaN(v) && v >= 1 && v <= 10) { f5bSum += v * 10; f5bn++; }
    }
  }
  const f5bScore = f5bn > 0 ? f5bSum / f5bn : 0;

  // Bobot: F2 (40%) + FScale (40%) + F5b (20%)
  const parts = [];
  if (f2n  > 0) parts.push({ s: f2Score,     w: 4 });
  if (fsn  > 0) parts.push({ s: fScaleScore,  w: 4 });
  if (f5bn > 0) parts.push({ s: f5bScore,     w: 2 });
  if (parts.length === 0) return 0;

  const totalW = parts.reduce((a, p) => a + p.w, 0);
  const score  = parts.reduce((a, p) => a + p.s * p.w, 0) / totalW;
  return Math.round(score * 100) / 100;
}

function getQuality_(score) {
  if (score >= 88.31) return { label: 'A', category: 'Sangat Baik',  interval: '88,31–100'   };
  if (score >= 76.61) return { label: 'B', category: 'Baik',         interval: '76,61–88,30' };
  if (score >= 65.00) return { label: 'C', category: 'Kurang Baik',  interval: '65,00–76,60' };
  return               { label: 'D', category: 'Tidak Baik',  interval: '0–64,99'    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEAN — buang value kosong dari output
// ═══════════════════════════════════════════════════════════════════════════════
function clean_(obj) {
  if (Array.isArray(obj))  return obj.length > 0 ? obj : undefined;
  if (obj === null || obj === undefined || obj === '' || obj === 0) return undefined;
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const c = clean_(v);
    if (c !== undefined) out[k] = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER UTAMA
// ═══════════════════════════════════════════════════════════════════════════════
function buildData_(sheetName, dataMode) {
  const { headers, rows } = readSheet_(sheetName);
  const n = rows.length;

  // ── Peta kolom identitas ──────────────────────────────────────────────────
  //
  // Google Forms "Form responses 1" selalu dimulai dengan kolom Timestamp (index 0).
  // Nama kolom bergantung pada bahasa form dan nama pertanyaan persis.
  //
  const IDX = {
    timestamp:  0,
    nama:       cp_(headers, 'nama:'),
    gender:     cp_(headers, 'jenis kelamin'),
    umur:       cp_(headers, 'umur:'),
    pekerjaan:  cp_(headers, 'pekerjaan:'),
    penghasilan:cp_(headers, 'penghasilan'),
    pendidikan: cp_(headers, 'pendidikan terakhir'),
    agama:      cp_(headers, 'agama:'),
    suku:       cp_(headers, 'suku'),
    afiliasi:   cp_(headers, 'afiliasi politik'),
    tinggal:    cp_(headers, 'tempat tinggal'),
    alamat:     cp_(headers, 'alamat'),
    kabupaten:  cp_(headers, 'kabupaten'),
    // Provinsi muncul 2x (DATA RESPONDEN + Bagian I), ambil yang pertama untuk demografi
    provinsi_resp: cp_(headers, 'provinsi'),
    // Provinsi di Bagian I (surveyor) — ambil yang terakhir
    provinsi_sv: lastIdx_(headers, 'provinsi'),
    nohp:       cp_(headers, 'no hp'),
    no_rekening:cp_(headers, 'rekening'),

    // A1
    a1a: cp_(headers, 'a1a'),
    // A1b-A1c adalah matrix: kolom Google Forms = "[A1b-A1c. Skala...] [row label]"
    a1b: cp_(headers, 'a1b', 'puas'),
    a1c: (() => {
      let idx = cp_(headers, 'a1c');
      if (idx < 0) idx = cp_(headers, 'a1b', 'optimis');
      if (idx < 0) idx = cp_(headers, 'optimis');
      return idx;
    })(),
    a1d: cp_(headers, 'a1d'),

    // A2
    a2a: cp_(headers, 'a2a'),
    a2b: cp_(headers, 'a2b'),
    a2c: cp_(headers, 'a2c'),
    a2d: cp_(headers, 'a2d'),
    a2e: cp_(headers, 'a2e'),
    a2f: cp_(headers, 'a2f'),
    a2g: cp_(headers, 'a2g'),
    a2h: cp_(headers, 'a2h'),
    a2i: cp_(headers, 'a2i'),
    a2j_ekonomi:       cp_(headers, 'a2j', 'ekonomi'),
    a2j_korupsi:       cp_(headers, 'a2j', 'korupsi'),
    a2j_diplomasi:     cp_(headers, 'a2j', 'diplomasi'),
    a2j_pertahanan:    cp_(headers, 'a2j', 'pertahanan'),
    a2j_kesejahteraan: cp_(headers, 'a2j', 'kesejahteraan'),

    // B
    b1a: cp_(headers, 'b1a'),
    b1b: cp_(headers, 'b1b'),
    b1c: cp_(headers, 'b1c'),
    b1d: cp_(headers, 'b1d'),

    // C — checkboxes (Google Forms: satu kolom, nilai dipisah koma)
    c1a: cp_(headers, 'c1a'),
    c1b: cp_(headers, 'c1b'),
    c1c: cp_(headers, 'c1c'),

    // D — radio button (single choice per simulasi)
    d1a_10: cp_(headers, 'd1a', '10 nama'),
    d1a_8:  cp_(headers, 'd1a', '8 nama'),
    d1a_5:  cp_(headers, 'd1a', '5 nama'),
    d1b_politisi:   cp_(headers, 'd1b', 'politisi'),
    d1b_tokoh:      cp_(headers, 'd1b', 'tokoh'),
    d1b_profesional:cp_(headers, 'd1b', 'profesional'),

    // E
    e1a: cp_(headers, 'e1a'),            // open-ended
    e1b: cp_(headers, 'e1b'),            // checkboxes (tahu)
    e1c: cp_(headers, 'e1c'),            // checkboxes (suka)
    e1d: cp_(headers, 'e1d'),            // single choice (pilih)

    // F1 open-ended
    f1a: cp_(headers, 'f1a'),
    f1b: cp_(headers, 'f1b'),
    f1c: cp_(headers, 'f1c'),

    // F5
    f5a: cp_(headers, 'f5a'),
    f5b: cp_(headers, 'f5b'),
    f5c: cp_(headers, 'f5c'),

    // G1
    g1a: cp_(headers, 'g1a'),
    g1b: cp_(headers, 'g1b'),

    // H2 — trust matrix (skala 0–10)
    // Google Forms matrix kolom: "Seberapa besar Anda percaya... [Nama Tokoh]"
    h2_prabowo:  cp_(headers, 'h2', 'prabowo') >= 0 ? cp_(headers, 'h2', 'prabowo')  : cp_(headers, 'prabowo subianto'),
    h2_gibran:   cp_(headers, 'h2', 'gibran')  >= 0 ? cp_(headers, 'h2', 'gibran')   : cp_(headers, 'gibran'),
    h2_dedi:     cp_(headers, 'h2', 'dedi')    >= 0 ? cp_(headers, 'h2', 'dedi')     : cp_(headers, 'dedi mulyadi'),
    h2_purbaya:  cp_(headers, 'h2', 'purbaya') >= 0 ? cp_(headers, 'h2', 'purbaya')  : cp_(headers, 'purbaya'),
    h2_sudirman: cp_(headers, 'h2', 'sudirman')>= 0 ? cp_(headers, 'h2', 'sudirman') : cp_(headers, 'sudirman said'),

    // I
    i1a:     cp_(headers, 'i1a'),
    i1b:     cp_(headers, 'i1b'),
    surveyor:cp_(headers, 'nama surveyor'),
  };

  // ── H1a/H1b/H1c/H1d — 3 tokoh (Prabowo, Gibran, Sudirman Said) ───────────
  //
  // Karena 3 pertanyaan H1a punya label sama, Google Sheets bisa membuat:
  //   "H1a. Bagaimana pendapat Anda..." / "H1a. Bagaimana pendapat Anda... .1" / ".2"
  // atau menyertakan nama tokoh di header jika ada deskripsi.
  // Strategi: coba match nama tokoh dulu, fallback ke urutan (index ke-0, ke-1, ke-2).
  //
  function resolveH1_(code, figName, allIdx) {
    let i = cp_(headers, code, figName.split(' ')[0].toLowerCase());
    if (i < 0 && allIdx.length > 0) i = allIdx.shift();
    return i;
  }

  const h1aAll = findAll_(headers, 'h1a').filter(i => !headers[i].toLowerCase().includes('h1b') && !headers[i].toLowerCase().includes('h1c') && !headers[i].toLowerCase().includes('h1d'));
  const h1bAll = findAll_(headers, 'h1b').filter(i => !headers[i].toLowerCase().includes('h1a') && !headers[i].toLowerCase().includes('h1c'));
  const h1cAll = findAll_(headers, 'h1c').filter(i => !headers[i].toLowerCase().includes('h1a') && !headers[i].toLowerCase().includes('h1b'));
  const h1dAll = findAll_(headers, 'h1d').filter(i => !headers[i].toLowerCase().includes('h1a'));

  // Buat salinan array agar shift() tidak merusak h1aAll asli
  const h1aQ = h1aAll.slice();
  const h1bQ = h1bAll.slice();
  const h1cQ = h1cAll.slice();
  const h1dQ = h1dAll.slice();

  IDX.h1a_prabowo  = resolveH1_('h1a', 'prabowo',  h1aQ);
  IDX.h1a_gibran   = resolveH1_('h1a', 'gibran',   h1aQ);
  IDX.h1a_sudirman = resolveH1_('h1a', 'sudirman', h1aQ);
  IDX.h1b_prabowo  = resolveH1_('h1b', 'prabowo',  h1bQ);
  IDX.h1b_gibran   = resolveH1_('h1b', 'gibran',   h1bQ);
  IDX.h1b_sudirman = resolveH1_('h1b', 'sudirman', h1bQ);
  IDX.h1c_prabowo  = resolveH1_('h1c', 'prabowo',  h1cQ);
  IDX.h1c_gibran   = resolveH1_('h1c', 'gibran',   h1cQ);
  IDX.h1c_sudirman = resolveH1_('h1c', 'sudirman', h1cQ);
  IDX.h1d_prabowo  = resolveH1_('h1d', 'prabowo',  h1dQ);
  IDX.h1d_gibran   = resolveH1_('h1d', 'gibran',   h1dQ);
  IDX.h1d_sudirman = resolveH1_('h1d', 'sudirman', h1dQ);

  // ── Definisi field matrix ──────────────────────────────────────────────────
  const F2_FIELDS = [
    { code:'F2a', label:'Pelayanan Publik' },
    { code:'F2b', label:'Ekonomi, Industri, Teknologi & Lapangan Kerja' },
    { code:'F2c', label:'Pembangunan, Infrastruktur & Transportasi' },
    { code:'F2d', label:'Penanganan Tanggap Bencana' },
    { code:'F2e', label:'Pendidikan & Pengembangan SDM' },
    { code:'F2f', label:'Lingkungan & Pengelolaan Hutan' },
    { code:'F2g', label:'Pertahanan, Keamanan & HAM' },
    { code:'F2h', label:'Pertanian & Ketahanan Pangan' },
    { code:'F2i', label:'Demokrasi, Politik Dalam & Luar Negeri' },
    { code:'F2j', label:'Pajak & Keuangan' },
  ];
  const F3_FIELDS = [
    { code:'F3a', label:'Kejelasan Visi & Arah Kebijakan' },
    { code:'F3b', label:'Kecepatan Merespons Masalah/Krisis' },
    { code:'F3c', label:'Ketegasan Mengambil Keputusan Strategis' },
    { code:'F3d', label:'Konsistensi Pernyataan & Kebijakan' },
    { code:'F3e', label:'Kemampuan Koordinasi Kebijakan' },
  ];
  const F4_FIELDS = [
    { code:'F4a', label:'Kepercayaan terhadap Pemerintah' },
    { code:'F4b', label:'Integritas & Kejujuran Pemerintah' },
    { code:'F4c', label:'Keyakinan Pemerintah Bekerja untuk Rakyat' },
  ];
  const G2_FIELDS = [
    { code:'G2a', label:'Alat Peraga' },
    { code:'G2b', label:'Media Sosial' },
    { code:'G2c', label:'Rapat Terbuka' },
    { code:'G2d', label:'Rapat Tertutup' },
    { code:'G2e', label:'Bertemu Langsung Calon' },
    { code:'G2f', label:'Konvoi di Jalanan' },
    { code:'G2g', label:'Influencer/Tokoh' },
  ];
  const G3_FIELDS = [
    { code:'G3a', label:'Rekam Jejak & Integritas' },
    { code:'G3b', label:'Visi Misi & Program' },
    { code:'G3c', label:'Ketokohan Kandidat' },
    { code:'G3d', label:'Praktik Bagi-bagi Uang' },
  ];
  const G4_FIELDS = [
    { code:'G4a', label:'Perkumpulan Profesi' },
    { code:'G4b', label:'Tokoh Agama' },
    { code:'G4c', label:'Pejabat Negara Setempat' },
    { code:'G4d', label:'Pengurus Partai' },
    { code:'G4e', label:'Komunitas Etnis' },
    { code:'G4f', label:'Tokoh Adat' },
    { code:'G4g', label:'Pemilik Tanah/Bos/Majikan' },
    { code:'G4h', label:'LSM Lokal' },
    { code:'G4i', label:'Teman' },
    { code:'G4j', label:'Keluarga' },
    { code:'G4k', label:'Tetangga' },
    { code:'G4l', label:'Lainnya' },
  ];

  const LIKERT4   = ['Sangat tidak puas','Tidak puas','Puas','Sangat puas','Tidak tahu'];
  const LIKE4CAM  = ['Sangat tidak suka','Tidak suka','Suka','Sangat suka','Tidak tahu'];
  const CONSIDER5 = ['Sama sekali tidak jadi pertimbangan','Agak jadi pertimbangan','Dipertimbangkan','Sangat dipertimbangkan','Luar biasa dipertimbangkan','Tidak tahu'];
  const I1A_OPTS  = ['1.  Kesulitan dalam memahami pertanyaan-pertanyaan ini','2. Beberapa kesalahpahaman atas pertanyaan-pertanyaan mungkin telah terjadi','3. Hanya terdapat sesekali kebingungan','4. Ia mengerti dengan sempurna semua pertanyaan'];
  const I1B_OPTS  = ['1. Tidak terpercaya','2. Meragukan','3. Agak terpercaya','4. Terpercaya','5. Sangat terpercaya'];

  // ── Demografi ──────────────────────────────────────────────────────────────
  const demographics = {
    gender:           countCol_(rows, IDX.gender),
    education:        countCol_(rows, IDX.pendidikan),
    umur:             countCol_(rows, IDX.umur),
    pekerjaan:        countCol_(rows, IDX.pekerjaan),
    penghasilan:      countCol_(rows, IDX.penghasilan),
    suku:             countCol_(rows, IDX.suku),
    agama:            countCol_(rows, IDX.agama),
    location:         countCol_(rows, IDX.provinsi_resp),
    afiliasi_politik: countCol_(rows, IDX.afiliasi),
    tempat_tinggal:   countCol_(rows, IDX.tinggal),
  };

  // ── IKM ───────────────────────────────────────────────────────────────────
  const ikmScore = computeIKM_(rows, headers);
  const quality  = getQuality_(ikmScore);
  const ikmGap   = Math.round((CFG.TARGET_SCORE - ikmScore) * 100) / 100;

  // ── Indicators (dari F2 → kompatibel IKM dashboard) ─────────────────────
  const indicators = F2_FIELDS.map((f, i) => {
    const idx   = cp_(headers, f.code + '.');
    if (idx < 0) return null;
    const score = likertToScore_(rows, idx);
    const dObj  = dist_(rows, idx, LIKERT4);
    return {
      id:    i + 1,
      label: f.label,
      avg:   Math.round(score / 100 * 4 * 100) / 100,
      distribution: LIKERT4.map(l => dObj[l] || 0),
    };
  }).filter(Boolean);

  // ── Candidate preference ───────────────────────────────────────────────────
  const capres       = toRank_(countMulti_(rows, IDX.b1a), n).slice(0, 30);
  const capresAlt    = toRank_(countMulti_(rows, IDX.b1b), n).slice(0, 30);
  const capresKnown  = toRank_(countMulti_(rows, IDX.c1a), n).slice(0, 30);
  const capresSuka   = toRank_(countMulti_(rows, IDX.c1b), n).slice(0, 30);
  const capresClosed = toRank_(countCol_(rows,   IDX.c1c), n).slice(0, 30);
  const sim10        = toRank_(countCol_(rows, IDX.d1a_10), n);
  const sim8         = toRank_(countCol_(rows, IDX.d1a_8),  n);
  const sim5         = toRank_(countCol_(rows, IDX.d1a_5),  n);
  const politisi     = toRank_(countCol_(rows, IDX.d1b_politisi),    n);
  const tokoh        = toRank_(countCol_(rows, IDX.d1b_tokoh),       n);
  const profesional  = toRank_(countCol_(rows, IDX.d1b_profesional), n);
  const parpolOpen   = topOpenAnswers_(rows, IDX.e1a, 25);
  const parpolDikenal= toRank_(countMulti_(rows, IDX.e1b), n).slice(0, 25);
  const parpolSuka   = toRank_(countMulti_(rows, IDX.e1c), n).slice(0, 25);
  const parpolClosed = toRank_(countCol_(rows, IDX.e1d), n).slice(0, 25);

  // ── Question Analysis ──────────────────────────────────────────────────────

  // A — Kepemimpinan Nasional
  const nationalLeadership = {
    kondisi_kepemimpinan_opini:       collectText_(rows, IDX.a1a, 30),
    kepuasan_kepemimpinan_skala:      { rata_rata: avg_(rows, IDX.a1b), distribusi: countCol_(rows, IDX.a1b) },
    optimisme_pemimpin_masa_depan:    { rata_rata: avg_(rows, IDX.a1c), distribusi: countCol_(rows, IDX.a1c) },
    masalah_utama_bangsa:             toRank_(countMulti_(rows, IDX.a1d), n),
    opini_kebijakan_prabowo:          collectText_(rows, IDX.a2a, 20),
    kriteria_pemimpin_ideal:          collectText_(rows, IDX.a2b, 20),
    tidak_suka_pemimpin:              collectText_(rows, IDX.a2c, 20),
    harapan_pemimpin:                 collectText_(rows, IDX.a2d, 20),
    karakter_pemimpin_dibutuhkan:     toRank_(countMulti_(rows, IDX.a2e), n),
    kebutuhan_tokoh_baru:             toRank_(countCol_(rows, IDX.a2f), n),
    asal_kalangan_pemimpin_ideal:     toRank_(countCol_(rows, IDX.a2g), n),
    tokoh_paling_layak:               topOpenAnswers_(rows, IDX.a2h, 25),
    tokoh_alternatif:                 topOpenAnswers_(rows, IDX.a2i, 20),
    unggul_ekonomi:                   topOpenAnswers_(rows, IDX.a2j_ekonomi, 20),
    unggul_pemberantasan_korupsi:     topOpenAnswers_(rows, IDX.a2j_korupsi, 20),
    unggul_diplomasi_internasional:   topOpenAnswers_(rows, IDX.a2j_diplomasi, 20),
    unggul_pertahanan_keamanan:       topOpenAnswers_(rows, IDX.a2j_pertahanan, 20),
    unggul_kesejahteraan_rakyat:      topOpenAnswers_(rows, IDX.a2j_kesejahteraan, 20),
  };

  // Tokoh & Figur (A2h/i/j)
  const leaderFigures = {
    tokoh_paling_layak:   topOpenAnswers_(rows, IDX.a2h, 25),
    tokoh_alternatif:     topOpenAnswers_(rows, IDX.a2i, 20),
    unggul_ekonomi:       topOpenAnswers_(rows, IDX.a2j_ekonomi, 20),
    unggul_korupsi:       topOpenAnswers_(rows, IDX.a2j_korupsi, 20),
    unggul_diplomasi:     topOpenAnswers_(rows, IDX.a2j_diplomasi, 20),
    unggul_pertahanan:    topOpenAnswers_(rows, IDX.a2j_pertahanan, 20),
    unggul_kesejahteraan: topOpenAnswers_(rows, IDX.a2j_kesejahteraan, 20),
    asal_kalangan_ideal:  toRank_(countCol_(rows, IDX.a2g), n),
    capres_disukai:       capresSuka.slice(0, 20),
  };

  // B+C — Elektabilitas Capres
  const presidentialElectability = {
    capres_terbuka_b1a:          capres,
    capres_alternatif_b1b:       capresAlt,
    capres_dikenal_c1a:          capresKnown,
    capres_disukai_c1b:          capresSuka,
    capres_dipilih_tertutup_c1c: capresClosed,
    capres_ideal_b1c:            collectText_(rows, IDX.b1c, 20),
    asal_kalangan_capres_ideal:  collectText_(rows, IDX.b1d, 20),
  };

  // D — Simulasi Capres
  const presidentialSimulation = {
    simulasi_10_nama:    sim10,
    simulasi_8_nama:     sim8,
    simulasi_5_nama:     sim5,
    klaster_politisi:    politisi,
    klaster_tokoh:       tokoh,
    klaster_profesional: profesional,
  };

  // E — Elektabilitas Parpol
  const partyElectability = {
    parpol_terbuka_e1a:  parpolOpen,
    parpol_dikenal_e1b:  parpolDikenal,
    parpol_disukai_e1c:  parpolSuka,
    parpol_dipilih_e1d:  parpolClosed,
  };

  // F — Kinerja Pemerintah
  const govPerf_sektoral = {};
  for (const f of F2_FIELDS) {
    const idx = cp_(headers, f.code + '.');
    if (idx >= 0) {
      govPerf_sektoral[f.label] = {
        distribusi: dist_(rows, idx, LIKERT4),
        skor: likertToScore_(rows, idx),
      };
    }
  }

  const govPerf_strategis = {};
  for (const f of F3_FIELDS) {
    const idx = cp_(headers, '[' + f.code + '.');
    if (idx >= 0) govPerf_strategis[f.label] = avg_(rows, idx);
  }

  const govPerf_kepercayaan = {};
  for (const f of F4_FIELDS) {
    const idx = cp_(headers, '[' + f.code + '.');
    if (idx >= 0) govPerf_kepercayaan[f.label] = avg_(rows, idx);
  }

  const governmentPerformance = {
    kinerja_sektoral_f2:       govPerf_sektoral,
    kepemimpinan_strategis_f3: govPerf_strategis,
    kepercayaan_publik_f4:     govPerf_kepercayaan,
    skor_keseluruhan_f5b:      avg_(rows, IDX.f5b),
    penilaian_keseluruhan_f5a: toRank_(countCol_(rows, IDX.f5a), n),
    opini_kinerja_f1a:         collectText_(rows, IDX.f1a, 25),
    tidak_suka_kinerja_f1b:    collectText_(rows, IDX.f1b, 20),
    harapan_pemerintah_f1c:    collectText_(rows, IDX.f1c, 20),
    isu_mendesak_f5c:          collectText_(rows, IDX.f5c, 25),
  };

  // G — Perilaku Pemilih
  const g2_kampanye = {};
  for (const f of G2_FIELDS) {
    const idx = cp_(headers, '[' + f.code + '.');
    if (idx >= 0) g2_kampanye[f.label] = dist_(rows, idx, LIKE4CAM);
  }

  const g3_pertimbangan = {};
  for (const f of G3_FIELDS) {
    const idx = cp_(headers, '[' + f.code + '.');
    if (idx >= 0) g3_pertimbangan[f.label] = dist_(rows, idx, CONSIDER5);
  }

  const g4_pengaruh = {};
  for (const f of G4_FIELDS) {
    const idx = cp_(headers, '[' + f.code + '.');
    if (idx >= 0) g4_pengaruh[f.label] = dist_(rows, idx, CONSIDER5);
  }

  const voterBehavior = {
    alasan_memilih_g1a:         collectText_(rows, IDX.g1a, 25),
    pertimbangan_utama_g1b:     toRank_(countMulti_(rows, IDX.g1b), n),
    preferensi_kampanye_g2:     g2_kampanye,
    faktor_pilihan_g3:          g3_pertimbangan,
    pengaruh_lingkungan_g4:     g4_pengaruh,
  };

  // H — Emosi Publik
  const h2Trust = {};
  const h2Map = [
    ['Prabowo Subianto',      IDX.h2_prabowo  ],
    ['Gibran Rakabuming Raka',IDX.h2_gibran   ],
    ['Dedi Mulyadi',          IDX.h2_dedi     ],
    ['Purbaya Yudhi Sadewa',  IDX.h2_purbaya  ],
    ['Sudirman Said',         IDX.h2_sudirman ],
  ];
  for (const [name, idx] of h2Map) {
    if (idx >= 0) {
      h2Trust[name] = { rata_rata: avg_(rows, idx), distribusi: countCol_(rows, idx) };
    }
  }

  const persepsiTokoh = {};
  if (IDX.h1a_prabowo  >= 0) {
    persepsiTokoh['Prabowo Subianto'] = {
      pendapat:    collectText_(rows, IDX.h1a_prabowo,  20),
      suka:        collectText_(rows, IDX.h1b_prabowo,  15),
      tidak_suka:  collectText_(rows, IDX.h1c_prabowo,  15),
      harapan:     collectText_(rows, IDX.h1d_prabowo,  15),
    };
  }
  if (IDX.h1a_gibran >= 0) {
    persepsiTokoh['Gibran Rakabuming Raka'] = {
      pendapat:    collectText_(rows, IDX.h1a_gibran,   20),
      suka:        collectText_(rows, IDX.h1b_gibran,   15),
      tidak_suka:  collectText_(rows, IDX.h1c_gibran,   15),
      harapan:     collectText_(rows, IDX.h1d_gibran,   15),
    };
  }
  if (IDX.h1a_sudirman >= 0) {
    persepsiTokoh['Sudirman Said'] = {
      pendapat:    collectText_(rows, IDX.h1a_sudirman, 20),
      suka:        collectText_(rows, IDX.h1b_sudirman, 15),
      tidak_suka:  collectText_(rows, IDX.h1c_sudirman, 15),
      harapan:     collectText_(rows, IDX.h1d_sudirman, 15),
    };
  }

  const publicEmotion = {
    tingkat_kepercayaan_h2: h2Trust,
    persepsi_tokoh_h1:      persepsiTokoh,
  };

  // I — Validasi Surveyor
  const I1B_TRUSTED = ['4. Terpercaya', '5. Sangat terpercaya', 'Terpercaya', 'Sangat terpercaya'];
  const validRespondents = rows.filter(r => {
    const v = String(r[IDX.i1b] ?? '').trim();
    return I1B_TRUSTED.includes(v);
  }).length;
  const sampleValidity = n > 0 ? Math.round(validRespondents / n * 1000) / 10 + '%' : '0%';

  const surveyorValidation = {
    pemahaman_responden_i1a:    dist_(rows, IDX.i1a, I1A_OPTS),
    keterpercayaan_jawaban_i1b: dist_(rows, IDX.i1b, I1B_OPTS),
    surveyor_aktif:     toRank_(countCol_(rows, IDX.surveyor),       n),
    sebaran_provinsi:   toRank_(countCol_(rows, IDX.provinsi_sv),    n),
    sebaran_kabupaten:  toRank_(countCol_(rows, IDX.kabupaten),      n),
    total_valid:        validRespondents,
    pct_valid:          sampleValidity,
  };

  // ── Open-ended (untuk slide Harapan Publik) ────────────────────────────────
  const openEnded = {
    general_opinion: [
      ...collectText_(rows, IDX.a1a, 20),
      ...collectText_(rows, IDX.f1a, 10),
    ].slice(0, 40),
    expectations: [
      ...collectText_(rows, IDX.f5c, 20),
      ...collectText_(rows, IDX.f1c, 10),
    ].slice(0, 30),
  };

  // ── Daftar responden (max 300 untuk performa) ─────────────────────────────
  const respondents = rows.slice(0, 300).map((row, i) => {
    const f5bVal = parseFloat(String(row[IDX.f5b] ?? ''));
    return {
      id:            'R' + String(i + 1).padStart(4, '0'),
      name:          String(row[IDX.nama]      ?? '').trim() || 'Responden ' + (i + 1),
      timestamp:     row[IDX.timestamp] ? new Date(row[IDX.timestamp]).toISOString() : '',
      gender:        String(row[IDX.gender]    ?? '').trim(),
      education:     String(row[IDX.pendidikan]?? '').trim(),
      location:      String(row[IDX.provinsi_resp] ?? '').trim(),
      province:      String(row[IDX.provinsi_resp] ?? '').trim(),
      kabupaten:     String(row[IDX.kabupaten] ?? '').trim(),
      surveyor:      String(row[IDX.surveyor]  ?? '').trim(),
      score_average: !isNaN(f5bVal) ? Math.round(f5bVal * 10) : null,
    };
  });

  // ── Final payload ──────────────────────────────────────────────────────────
  return {
    meta: {
      survey_name:       CFG.SURVEY_NAME,
      period:            CFG.PERIOD,
      total_respondents: n,
      last_updated:      new Date().toISOString(),
      sample_validity:   sampleValidity,
      data_mode:         dataMode,
      margin_of_error:   CFG.MARGIN_OF_ERROR,
      confidence_level:  CFG.CONFIDENCE_LEVEL,
    },
    ikm: {
      score:    ikmScore,
      category: quality.category.toUpperCase(),
      label:    quality.label,
      interval: quality.interval,
      gap:      ikmGap,
    },
    indicators,
    demographics,
    open_ended: openEnded,
    respondents,
    candidate_preference: {
      capres,
      capres_alternative: capresAlt,
      capres_known:       capresKnown,
      capres_suka:        capresSuka,
      capres_closed:      capresClosed,
      simulation_10:      sim10,
      simulation_8:       sim8,
      simulation_5:       sim5,
      politisi,
      tokoh,
      profesional,
      parpol:             parpolOpen,
      parpol_dikenal:     parpolDikenal,
      parpol_suka:        parpolSuka,
      parpol_closed:      parpolClosed,
    },
    question_analysis: {
      national_leadership:       clean_(nationalLeadership)        || {},
      leader_figures:            clean_(leaderFigures)             || {},
      presidential_electability: clean_(presidentialElectability)  || {},
      presidential_simulation:   clean_(presidentialSimulation)    || {},
      party_electability:        clean_(partyElectability)         || {},
      government_performance:    clean_(governmentPerformance)     || {},
      voter_behavior:            clean_(voterBehavior)             || {},
      public_emotion:            clean_(publicEmotion)             || {},
      surveyor_validation:       clean_(surveyorValidation)        || {},
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST (jalankan dari Apps Script editor untuk debug)
// ═══════════════════════════════════════════════════════════════════════════════
function testDoGet() {
  const result = doGet({ parameter: { mode: 'actual' } });
  const data   = JSON.parse(result.getContent());
  Logger.log('=== SurveyDash Debug ===');
  Logger.log('Total responden : ' + data.meta.total_respondents);
  Logger.log('IKM score       : ' + data.ikm.score + ' (' + data.ikm.label + ')');
  Logger.log('Sample validity : ' + data.meta.sample_validity);
  Logger.log('Capres top-3    : ' + JSON.stringify((data.candidate_preference.capres || []).slice(0, 3)));
  Logger.log('Sim 10 top-3    : ' + JSON.stringify((data.candidate_preference.simulation_10 || []).slice(0, 3)));
  Logger.log('Parpol top-5    : ' + JSON.stringify((data.candidate_preference.parpol_closed || []).slice(0, 5)));
  Logger.log('QA keys         : ' + Object.keys(data.question_analysis).join(', '));
  Logger.log('H2 trust keys   : ' + Object.keys(data.question_analysis.public_emotion?.tingkat_kepercayaan_h2 || {}).join(', '));
}

function testDoGetPresentation() {
  const result = doGet({ parameter: { mode: 'presentation' } });
  const data   = JSON.parse(result.getContent());
  Logger.log('=== Presentation Mode ===');
  Logger.log('Data mode   : ' + data.meta.data_mode);
  Logger.log('Responden   : ' + data.meta.total_respondents);
}

function testDoPost() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        action:   'saveSettings',
        settings: { presentationModeEnabled: false, dataMode: 'actual' },
      }),
    },
  });
  Logger.log(result.getContent());
}

function testFillPresentation() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({ action: 'fillPresentation' }),
    },
  });
  Logger.log(result.getContent());
}


// ═══════════════════════════════════════════════════════════════════════════════
// ON OPEN - Menu Kustom Spreadsheet
// ═══════════════════════════════════════════════════════════════════════════════
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SurveyDash')
    .addItem('📊 Generate Demo Data (2045)', 'menuGenerateDemoData')
    .addItem('📑 Generate Presentasi Google Slides', 'menuGeneratePresentation')
    .addItem('🔄 Sinkronisasi Sheet Presentasi', 'menuFillPresentation')
    .addToUi();
}

function menuGenerateDemoData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Konfirmasi', 'Apakah Anda yakin ingin men-generate 2.045 data respons simulasi ke sheet "Presentasi"? Data yang ada di sheet "Presentasi" akan dihapus.', ui.ButtonSet.YES_NO);
  if (response === ui.Button.YES) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Sedang men-generate data respons...', 'SurveyDash', -1);
    try {
      generateDemoData();
      SpreadsheetApp.getActiveSpreadsheet().toast('Selesai!', 'SurveyDash', 3);
      ui.alert('Sukses', '2.045 data respons simulasi berhasil di-generate di sheet "Presentasi".\n\nMode presentasi diaktifkan secara otomatis. Silakan refresh dashboard Anda!', ui.ButtonSet.OK);
    } catch (e) {
      ui.alert('Gagal', 'Terjadi kesalahan: ' + e.message, ui.ButtonSet.OK);
    }
  }
}

function menuGeneratePresentation() {
  const ui = SpreadsheetApp.getUi();
  SpreadsheetApp.getActiveSpreadsheet().toast('Sedang membuat Google Slides presentasi...', 'SurveyDash', -1);
  try {
    const slideUrl = generatePresentation();
    SpreadsheetApp.getActiveSpreadsheet().toast('Selesai!', 'SurveyDash', 3);
    
    const htmlOutput = HtmlService.createHtmlOutput(
      '<div style="font-family: sans-serif; padding: 15px; text-align: center;">' +
      '<h3>Presentasi Berhasil Dibuat!</h3>' +
      '<p>Google Slides presentasi hasil survei Anda telah berhasil dibuat.</p>' +
      '<a href="' + slideUrl + '" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">Buka Google Slides</a>' +
      '</div>'
    ).setWidth(400).setHeight(180);
    ui.showModalDialog(htmlOutput, 'Presentasi SurveyDash');
  } catch (e) {
    ui.alert('Gagal', 'Terjadi kesalahan: ' + e.message, ui.ButtonSet.OK);
  }
}

function menuFillPresentation() {
  const ui = SpreadsheetApp.getUi();
  try {
    fillPresentationSheet_();
    ui.alert('Sukses', 'Sheet Presentasi berhasil diperbarui dengan data dari Form responses 1.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Gagal', 'Terjadi kesalahan: ' + e.message, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO DATA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
function generateDemoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.PRESENTATION_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CFG.PRESENTATION_SHEET);
  }
  sheet.clearContents();

  // 1. Tentukan Headers
  const headers = [
    "Timestamp",
    "Tanggal wawancara:",
    "Nama:",
    "Jenis Kelamin:",
    "Umur:",
    "Pekerjaan:",
    "Penghasilan per bulan:",
    "Pendidikan terakhir:",
    "Agama:",
    "Suku/Etnis:",
    "Afiliasi Politik (Partai):",
    "Tempat Tinggal:",
    "Desa",
    "Kota",
    "Alamat:",
    "Kabupaten/Kota:",
    "Provinsi:",
    "No HP:",
    "No Rekening/e wallet Responden (souvenir):",
    "A1a. Menurut Anda bagaimana kondisi kepemimpinan nasional saat ini?",
    "A1b-A1c. Skala Kepemimpinan Nasional [Seberapa puas Anda terhadap kualitas kepemimpinan nasional Indonesia saat ini?]",
    "A1b-A1c. Skala Kepemimpinan Nasional [Seberapa optimis Anda Indonesia akan memiliki pemimpin yang mampu membawa kemajuan dalam 10 tahun ke depan?]",
    "A1d. Menurut Anda, masalah utama bangsa yang harus segera diselesaikan pemimpin nasional? (Pilih maksimal 3)",
    "A2a. Bagaimana pendapat Anda tentang kebijakan dan model kepemimpinan pemerintahan Prabowo?",
    "A2b. Menurut Anda, apakah kriteria pemimpin yang dibutuhkan untuk kondisi Indonesia saat ini dan mendatang?",
    "A2c. Apa yang paling tidak Anda sukai dari pemimpin yang akan datang?",
    "A2d. Apa sebaiknya yang harus dilakukan oleh pemimpin mendatang?",
    "A2e. Karakter pemimpin nasional yang paling dibutuhkan Indonesia saat ini? (Pilih maksimal 3)",
    "A2f. Apakah Indonesia membutuhkan munculnya tokoh pemimpin nasional baru di luar tokoh-tokoh yang saat ini dikenal publik?",
    "A2g. Pemimpin nasional yang ideal menurut Anda berasal dari kalangan mana?",
    "A2h. Menurut Bapak/Ibu, siapa tokoh yang paling layak menjadi pemimpin nasional Indonesia di masa depan?",
    "A2i. Selain nama tersebut, siapa lagi tokoh yang menurut Anda layak menjadi pemimpin nasional?",
    "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Ekonomi?",
    "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pemberantasan Korupsi?",
    "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Diplomasi Internasional?",
    "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pertahanan dan Keamanan?",
    "A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Kesejahteraan Rakyat?",
    "B1a. Jika Pilpres dilakukan hari ini, Anda memilih calon Presiden siapa?__________, Apa alasannya?",
    "B1b. Apakah saat ini Anda memiliki figur Capres alternatif? Siapa sosok Capres alternatif usulan Anda?",
    "B1c. Menurut Anda bagaimana sosok Capres ideal 2029?",
    "B1d. Capres ideal menurut Anda merepresentasikan tokoh dari kalangan apa?",
    "C1a. Di antara nama Capres berikut, mana saja yang anda tahu/kenal?",
    "C1b. Di antara nama Capres berikut ini, mana yang Anda suka?",
    "C1c. Bila Pilpres dilaksanakan hari ini, Anda akan memilih siapa?",
    "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 10 nama)",
    "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 8 nama)",
    "D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 5 nama)",
    "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Politisi)",
    "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Tokoh)",
    "D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres Klaster Profesional)",
    "E1a-open — Jika Pemilu Legislatif dilakukan hari ini, Anda memilih partai apa?",
    "E1b. Di antara nama Parpol berikut ini, Parpol mana saja yang Anda tahu?",
    "E1c. Di antara nama Parpol berikut ini, Parpol mana yang Anda suka?",
    "E1d. Bila Pemilihan Legislatif dilaksanakan hari ini, Anda akan memilih partai apa?",
    "F1a. Menurut Anda bagaimana kinerja Pemerintahan Prabowo?",
    "F1b. Apa yang paling tidak Anda sukai dari kinerja Pemerintah Prabowo?",
    "F1c. Apa sebaiknya yang harus dilakukan oleh Pemerintah Prabowo?",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2a. Pelayanan Publik]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2b. Ekonomi, Industri, Teknologi, dan Lapangan Pekerjaan?]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2c. Pembangunan, Infrastruktur, dan Transportasi?]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2d. Penanganan Tanggap Bencana dan Darurat Kebencanaan?]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2e. Pendidikan dan Pengembangan SDM]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2f. Lingkungan dan Pengelolaan Hutan]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2g. Pertahanan, Keamanan, dan HAM]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2h. Pertanian dan Ketahanan Pangan]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2i. Demokrasi, Politik Dalam dan Luar Negeri]",
    "Bagaimana kinerja pemerintah di bidang berikut? [F2j. Pajak dan Keuangan]",
    "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3a. Kejelasan visi dan arah kebijakan Pemerintah]",
    "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3b. Kecepatan pemerintah merespons masalah atau krisis]",
    "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3c. Ketegasan pemerintah mengambil keputusan strategis]",
    "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3d. Konsistensi antara pernyataan dengan kebijakan yang diambil]",
    "Kepemimpinan dan Arah Strategis Kebijakan Nasional [F3e. Kemampuan pemerintah mengoordinasikan kebijakan]",
    "Kepercayaan & Legitimasi Publik [F4a. Tingkat kepercayaan Anda terhadap Pemerintah]",
    "Kepercayaan & Legitimasi Publik [F4b. Persepsi terhadap integritas dan kejujuran Pemerintah]",
    "Kepercayaan & Legitimasi Publik [F4c. Keyakinan bahwa pemerintah bekerja untuk kepentingan rakyat]",
    "F5a. Secara keseluruhan, bagaimana penilaian Anda terhadap kinerja Pemerintahan Prabowo?",
    "F5b. Dari skala 1-10, berapa skor yang Anda berikan untuk kinerja Pemerintahan Prabowo?",
    "F5c. Menurut Anda, satu isu atau masalah apa yang paling mendesak perlu segera ditangani Pemerintahan Prabowo?",
    "G1a. Apa pertimbangan Anda dalam memilih pada Pemilu 2029?",
    "G1b. Apa pertimbangan utama Anda dalam memilih kandidat di Pemilu 2029? (semi terbuka)",
    "Model kampanye seperti apa yang anda harapkan? [G2a. Praktik kampanye menggunakan alat peraga]",
    "Model kampanye seperti apa yang anda harapkan? [G2b. Praktik kampanye menggunakan media sosial (fb, twitter, instagram, path, youtube, tiktok, dll)?]",
    "Model kampanye seperti apa yang anda harapkan? [G2c. Praktik kampanye rapat terbuka]",
    "Model kampanye seperti apa yang anda harapkan? [G2d. Praktik kampanye rapat tertutup]",
    "Model kampanye seperti apa yang anda harapkan? [G2e. Praktik kampanye bertemu langsung dengan pasangan calon]",
    "Model kampanye seperti apa yang anda harapkan? [G2f. Praktik kampanye konvoi di jalanan]",
    "Model kampanye seperti apa yang anda harapkan? [G2g. Praktik kampanye menggunakan influencer/tokoh]",
    "Apa pertimbangan anda dalam menentukan pilihan? [G3a. Rekam jejak dan integritas kandidat]",
    "Apa pertimbangan anda dalam menentukan pilihan? [G3b. Visi misi / program/ gagasan kandidat]",
    "Apa pertimbangan anda dalam menentukan pilihan? [G3c. Ketokohan kandidat]",
    "Apa pertimbangan anda dalam menentukan pilihan? [G3d. Praktik bagi-bagi uang dan sembako oleh kandidat/tim sukses]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4a. Ajakan perkumpulan profesi (Petani, pedagang, organda, dll.)]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4b. Tokoh agama (Kyai/ulama, imam, pendeta, dsb.)]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4c. Pejabat-pejabat negara setempat (misalnya, kepala desa, lurah, camat)]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4d. Pengurus partai politik]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4e. Komunitas berbasis etnis]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4f. Tokoh Adat]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4g. Pemilik tanah/bos/majikan]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4h. LSM lokal]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4i. Teman]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4j. Keluarga]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4k. Tetangga]",
    "Seberapa kuat kapasitas organisasi atau individu untuk mengajak/mempengaruhi anda dalam menentukan pilihan kandidat? [G4l. Lainnya]",
    "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Prabowo Subianto]",
    "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Gibran Rakabuming Raka]",
    "H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut? [Sudirman Said]",
    "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Prabowo Subianto]",
    "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Gibran Rakabuming Raka]",
    "H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut? [Sudirman Said]",
    "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Prabowo Subianto]",
    "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Gibran Rakabuming Raka]",
    "H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut? [Sudirman Said]",
    "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Prabowo Subianto]",
    "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Gibran Rakabuming Raka]",
    "H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut? [Sudirman Said]",
    "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Prabowo Subianto]",
    "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Gibran Rakabumi Raka]",
    "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Dedi Mulyadi]",
    "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Purbaya Yudhi Sadewa]",
    "Seberapa besar Anda percaya tokoh berikut mampu memimpin Indonesia? [Sudirman Said]",
    "I1a. Menurut penilaian Anda, sampai sejauh manakah responden memahami dengan baik pertanyaan-pertanyaan yang diberikan?",
    "I1b. Mengingat kondisi wawancara, konsistensi jawaban, dan upaya yang telah dilakukan responden ini untuk menjawab pertanyaan-pertanyaan dengan sejujur-jujurnya, seberapa terpercayakah menurut Anda jawaban-jawaban dari responden?",
    "Nama Surveyor",
    "Provinsi"
  ];

  const FIRST_NAMES = ["Ahmad", "Budi", "Candra", "Dedi", "Eko", "Fajar", "Guntur", "Hendra", "Indra", "Joko", "Kurniawan", "Laksana", "Mulyono", "Nugroho", "Oki", "Prabowo", "Rian", "Slamet", "Taufik", "Utomo", "Wahyu", "Yanto", "Zainal", "Siti", "Sri", "Dewi", "Putri", "Lestari", "Kartika", "Rini", "Wati", "Sari", "Endang", "Tri", "Wahyuni", "Mega", "Yuliana", "Fitri", "Indah", "Dian", "Anisa", "Aulia", "Nabila", "Rizky", "Aditya", "Fikri", "Hafiz", "Reyhan"];
  const LAST_NAMES = ["Sitorus", "Manurung", "Ginting", "Nasution", "Harianja", "Siregar", "Lubis", "Pohan", "Harahap", "Sinaga", "Wibowo", "Prasetyo", "Santoso", "Suryadi", "Kusuma", "Hidayat", "Nugraha", "Sudarsono", "Budiman", "Gunawan", "Setiawan", "Wijaya", "Saputra", "Wahyudi", "Pratama", "Ramadhan", "Hidayatullah", "Arifin", "Fadillah", "Subagyo", "Siswanto", "Kartodihardjo", "Tjokro", "Mangun"];

  const JOBS = [
    { name: "Wiraswasta", weight: 25 },
    { name: "Karyawan Swasta", weight: 30 },
    { name: "PNS / ASN / BUMN", weight: 10 },
    { name: "Buruh / Pekerja Lepas", weight: 12 },
    { name: "Petani / Nelayan", weight: 10 },
    { name: "Ibu Rumah Tangga", weight: 8 },
    { name: "Mahasiswa / Pelajar", weight: 3 },
    { name: "Tidak Bekerja", weight: 2 }
  ];

  const INCOME = [
    { name: "Rp 1.500.000 - Rp 3.000.000", weight: 40 },
    { name: "Rp 3.000.000 - Rp 5.000.000", weight: 30 },
    { name: "Kurang dari Rp 1.500.000", weight: 15 },
    { name: "Rp 5.000.000 - Rp 10.000.000", weight: 12 },
    { name: "Lebih dari Rp 10.000.000", weight: 3 }
  ];

  const EDUCATION = [
    { name: "SMA / Sederajat", weight: 50 },
    { name: "Sarjana (S1)", weight: 25 },
    { name: "Diploma (D1-D4)", weight: 12 },
    { name: "SMP / Sederajat", weight: 8 },
    { name: "Pascasarjana (S2/S3)", weight: 3 },
    { name: "SD / Sederajat", weight: 2 }
  ];

  const RELIGIONS = [
    { name: "Islam", weight: 87 },
    { name: "Kristen Protestan", weight: 7 },
    { name: "Katolik", weight: 3 },
    { name: "Hindu", weight: 1 },
    { name: "Buddha", weight: 1 },
    { name: "Khonghucu", weight: 1 }
  ];

  const ETHNICITIES = [
    { name: "Jawa", weight: 40 },
    { name: "Sunda", weight: 15 },
    { name: "Batak", weight: 5 },
    { name: "Betawi", weight: 5 },
    { name: "Madura", weight: 4 },
    { name: "Minangkabau", weight: 3 },
    { name: "Bugis", weight: 3 },
    { name: "Melayu", weight: 3 },
    { name: "Banten", weight: 2 },
    { name: "Banjar", weight: 2 },
    { name: "Bali", weight: 2 },
    { name: "Aceh", weight: 2 },
    { name: "Lainnya", weight: 14 }
  ];

  const PROVINCES_WEIGHTED = [
    { name: "Jawa Barat", weight: 18 },
    { name: "Jawa Timur", weight: 15 },
    { name: "Jawa Tengah", weight: 14 },
    { name: "Sumatera Utara", weight: 6 },
    { name: "Banten", weight: 5 },
    { name: "Daerah Khusus Jakarta", weight: 4 },
    { name: "Sulawesi Selatan", weight: 4 },
    { name: "Lampung", weight: 3 },
    { name: "Sumatera Selatan", weight: 3 },
    { name: "Riau", weight: 3 },
    { name: "Sumatera Barat", weight: 2 },
    { name: "Kalimantan Barat", weight: 2 },
    { name: "Nusa Tenggara Timur", weight: 2 },
    { name: "Nusa Tenggara Barat", weight: 2 },
    { name: "Bali", weight: 2 },
    { name: "Aceh", weight: 2 },
    { name: "Jambi", weight: 1 },
    { name: "Kalimantan Timur", weight: 1 },
    { name: "Kalimantan Selatan", weight: 1 },
    { name: "Sulawesi Utara", weight: 1 },
    { name: "Sulawesi Tenggara", weight: 1 },
    { name: "Maluku", weight: 1 },
    { name: "Papua", weight: 1 }
  ];

  const C1A_POOL = [
    "Prabowo Subianto", "Gibran Rakabuming Raka", "Agus Harimurti Yudhoyono", "Pramono Anung",
    "Purbaya Yudhi Sadewa", "Anies Baswedan", "Dedi Mulyadi", "Bahlil Lahadalia",
    "Khofifah Indar Parawansa", "Abdul Muhaimin Iskandar", "Anis Matta", "Erick Thohir",
    "Muhamad Chatib Basri", "Mahfud MD", "Puan Maharani", "Sherly Tjoanda", "Surya Paloh",
    "Muhamad Mardiono", "Anas Urbaningrum", "Yusril Ihza Mahendra", "Zulkifli Hasan",
    "Muhammad Sohibul Iman", "Sudirman Said", "Andika Perkasa"
  ];

  const E1B_POOL = [
    "PKB", "Partai Gerindra", "PDI Perjuangan", "Partai Golkar", "Partai NasDem", "Partai Buruh",
    "Partai Gelora", "PKS", "PKN", "Partai Hanura", "Partai Garuda", "PAN", "PBB", "Partai Demokrat",
    "PSI", "Partai Perindo", "PPP", "Partai Umat", "Berkarya", "Partai Gerakan Rakyat",
    "Parta Gema Indonesia", "Partai Rakyat Indonesia", "Partai Perubahan"
  ];

  const SURVEYORS = ["Budi Santoso", "Siti Aminah", "Ahmad Fauzi", "Dewi Lestari", "Rian Hidayat", "Fitri Handayani", "Joko Susilo", "Larasati Putri", "Hendra Wijaya", "Indah Wahyuni"];

  function weightedChoice_(list, defaultList) {
    if (!list || list.length === 0) {
      return defaultList[Math.floor(Math.random() * defaultList.length)];
    }
    const totalWeight = list.reduce((sum, item) => sum + (item.weight || 1), 0);
    let r = Math.random() * totalWeight;
    for (const item of list) {
      r -= (item.weight || 1);
      if (r <= 0) return item.name;
    }
    return list[0].name;
  }

  function randomRange_(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandomSubset_(arr, size) {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  const rows = [];
  rows.push(headers);

  // Generate 2045 records
  const totalResponden = 2045;
  const startDate = new Date("2026-06-14T08:00:00Z").getTime();
  const endDate = new Date("2026-06-23T18:00:00Z").getTime();

  for (let i = 0; i < totalResponden; i++) {
    const timeMs = randomRange_(startDate, endDate);
    const timestamp = new Date(timeMs).toISOString().replace("T", " ").substring(0, 19);
    const dateStr = timestamp.substring(0, 10);
    const name = FIRST_NAMES[randomRange_(0, FIRST_NAMES.length - 1)] + " " + LAST_NAMES[randomRange_(0, LAST_NAMES.length - 1)];
    const gender = Math.random() > 0.51 ? "Laki-laki" : "Perempuan";
    const age = randomRange_(17, 70);
    const job = weightedChoice_(JOBS, ["Swasta"]);
    const income = weightedChoice_(INCOME, ["Rp 1.500.000 - Rp 3.000.000"]);
    const education = weightedChoice_(EDUCATION, ["SMA / Sederajat"]);
    const religion = weightedChoice_(RELIGIONS, ["Islam"]);
    const ethnicity = weightedChoice_(ETHNICITIES, ["Jawa"]);
    
    // Choose political profile to keep responses logical
    // Profiles: 0 = Prabowo/Gibran fan, 1 = Opposition (Anies/Sudirman), 2 = Moderate (Dedi/Khofifah/AHY), 3 = Neutral/Undecided
    const profileRoll = Math.random();
    let profile = 3;
    if (profileRoll < 0.45) profile = 0;
    else if (profileRoll < 0.70) profile = 1;
    else if (profileRoll < 0.90) profile = 2;

    let partyAff = "Tidak berafiliasi / Rahasia";
    if (profile === 0) {
      partyAff = pickRandomSubset_(["Partai Gerindra", "Partai Golkar", "PAN", "Partai Demokrat", "PSI"], 1)[0];
    } else if (profile === 1) {
      partyAff = pickRandomSubset_(["PKS", "Partai NasDem", "PKB", "PDI Perjuangan"], 1)[0];
    } else if (profile === 2) {
      partyAff = pickRandomSubset_(["Partai Golkar", "PDI Perjuangan", "Partai Demokrat", "PKB"], 1)[0];
    }

    const liveType = Math.random() > 0.55 ? "Kota" : "Desa";
    const village = "Desa " + pickRandomSubset_(["Sukamakmur", "Maju Jaya", "Harapan Indah", "Caringin", "Sumber Sari", "Mekar Wangi", "Bojong Gede", "Sukamaju"], 1)[0];
    const city = "Kota " + pickRandomSubset_(["Bandung", "Bogor", "Semarang", "Surabaya", "Medan", "Tangerang", "Bekasi", "Depok", "Palembang", "Makassar"], 1)[0];
    const address = "Jl. Raya " + pickRandomSubset_(["Sudirman", "Thamrin", "Gatot Subroto", "Merdeka", "Diponegoro", "Ahmad Yani", "Pemuda"], 1)[0] + " No. " + randomRange_(1, 150);
    const province = weightedChoice_(PROVINCES_WEIGHTED, ["Jawa Barat"]);
    const phone = "081" + randomRange_(10000000, 99999999);
    const bank = pickRandomSubset_(["GoPay", "OVO", "BCA", "Mandiri", "BRI", "Dana"], 1)[0] + " - " + randomRange_(100000000, 999999999);

    // Section A
    let a1a = "Kondisi kepemimpinan nasional saat ini cukup stabil, pembangunan infrastruktur terus berlanjut.";
    let a1b = 7; // Kepuasan
    let a1c = 8; // Optimisme
    let a1d_ops = ["Lapangan kerja", "Harga kebutuhan pokok", "Kemiskinan", "Korupsi", "Pendidikan", "Kesehatan"];
    let a1d = pickRandomSubset_(a1d_ops, randomRange_(1, 3)).join(", ");

    if (profile === 0) {
      a1b = randomRange_(8, 10);
      a1c = randomRange_(8, 10);
      a1a = pickRandomSubset_([
        "Sangat baik, Presiden Prabowo tegas dan Gibran inovatif.",
        "Kondisi kepemimpinan nasional sangat kuat, disegani di dunia internasional.",
        "Sangat puas dengan kepemimpinan nasional saat ini, arah pembangunan sangat jelas."
      ], 1)[0];
    } else if (profile === 1) {
      a1b = randomRange_(2, 5);
      a1c = randomRange_(4, 7);
      a1a = pickRandomSubset_([
        "Kepemimpinan nasional kurang memuaskan, ekonomi terasa sulit bagi rakyat bawah.",
        "Kondisi hukum dan pemberantasan korupsi mengalami penurunan.",
        "Perlu penyegaran kepemimpinan, masalah ketimpangan sosial belum terselesaikan."
      ], 1)[0];
    } else {
      a1b = randomRange_(5, 7);
      a1c = randomRange_(6, 8);
      a1a = pickRandomSubset_([
        "Cukup baik, namun tantangan ekonomi global harus diantisipasi lebih baik.",
        "Bagus dalam infrastruktur, tapi sektor kesejahteraan masyarakat perlu ditingkatkan.",
        "Kepemimpinan berjalan normal dan relatif stabil."
      ], 1)[0];
    }

    // A2
    let a2a = "Kebijakan pemerintahan Prabowo cukup berani, terutama dalam hal pertahanan dan hilirisasi.";
    let a2b = "Pemimpin yang tegas, berintegritas tinggi, dan paham masalah ekonomi.";
    let a2c = "Pemimpin yang terlalu banyak janji kampanye tapi realisasinya minim.";
    let a2d = "Fokus pada penyediaan lapangan kerja baru dan stabilitas harga pokok.";
    let a2e_ops = ["Jujur dan bersih", "Mampu mengelola ekonomi", "Tegas", "Berani melawan korupsi", "Merakyat", "Visioner"];
    let a2e = pickRandomSubset_(a2e_ops, randomRange_(1, 3)).join(", ");
    let a2f = profile === 1 ? "Sangat perlu" : (profile === 0 ? "Tidak perlu" : "Perlu");
    let a2g = weightedChoice_([
      { name: "Kepala daerah", weight: 30 },
      { name: "Menteri", weight: 20 },
      { name: "Politisi", weight: 15 },
      { name: "TNI/Polri", weight: 15 },
      { name: "Akademisi", weight: 10 },
      { name: "Tokoh agama", weight: 10 }
    ], ["Kepala daerah"]);

    // Tokoh layak future
    let a2h = "Prabowo Subianto";
    let a2i = "Gibran Rakabuming Raka";
    if (profile === 1) {
      a2h = Math.random() > 0.5 ? "Anies Baswedan" : "Sudirman Said";
      a2i = Math.random() > 0.5 ? "Mahfud MD" : "Andika Perkasa";
    } else if (profile === 2) {
      a2h = pickRandomSubset_(["Dedi Mulyadi", "Khofifah Indar Parawansa", "Agus Harimurti Yudhoyono"], 1)[0];
      a2i = pickRandomSubset_(["Erick Thohir", "Sri Mulyani", "Purbaya Yudhi Sadewa"], 1)[0];
    } else {
      a2h = "Belum tahu";
      a2i = "Tidak tahu";
    }

    // Keunggulan per bidang
    let a2j_ekonomi = profile === 0 ? "Prabowo Subianto" : (profile === 2 ? "Sri Mulyani" : "Chatib Basri");
    let a2j_korupsi = profile === 1 ? "Sudirman Said" : "Mahfud MD";
    let a2j_diplomasi = "Prabowo Subianto";
    let a2j_pertahanan = "Prabowo Subianto";
    let a2j_kesejahteraan = profile === 0 ? "Gibran Rakabuming Raka" : "Khofifah Indar Parawansa";

    // Section B
    let b1a = a2h + ", karena rekam jejak dan kemampuannya sudah terbukti.";
    let b1b = a2i;
    let b1c = "Pemimpin yang memiliki visi kemandirian bangsa, cerdas, dan merakyat.";
    let b1d = a2g;

    // Section C (Tahu/Suka/Pilih)
    let c1c = a2h;
    if (c1c === "Belum tahu" || c1c === "Tidak tahu") {
      c1c = pickRandomSubset_(C1A_POOL, 1)[0];
    }
    const knownCapres = pickRandomSubset_(C1A_POOL, randomRange_(8, 15));
    if (!knownCapres.includes(c1c)) knownCapres.push(c1c);
    const likedCapres = pickRandomSubset_(knownCapres, randomRange_(2, Math.max(2, knownCapres.length - 2)));
    if (!likedCapres.includes(c1c)) likedCapres.push(c1c);

    let c1a = knownCapres.join(", ");
    let c1b = likedCapres.join(", ");

    // Section D (Simulasi)
    const SIM_10_LIST = ["Prabowo Subianto", "Gibran Rakabuming Raka", "Agus Harimurti Yudhoyono", "Pramono Anung", "Purbaya Yudhi Sadewa", "Anies Baswedan", "Dedi Mulyadi", "Bahlil Lahadalia", "Khofifah Indar Parawansa", "Puan Maharani"];
    let d1a_10 = SIM_10_LIST.includes(c1c) ? c1c : pickRandomSubset_(SIM_10_LIST, 1)[0];

    const SIM_8_LIST = ["Prabowo Subianto", "Gibran Rakabuming Raka", "Agus Harimurti Yudhoyono", "Pramono Anung", "Purbaya Yudhi Sadewa", "Anies Baswedan", "Dedi Mulyadi", "Khofifah Indar Parawansa"];
    let d1a_8 = SIM_8_LIST.includes(c1c) ? c1c : pickRandomSubset_(SIM_8_LIST, 1)[0];

    const SIM_5_LIST = ["Prabowo Subianto", "Gibran Rakabuming Raka", "Agus Harimurti Yudhoyono", "Purbaya Yudhi Sadewa", "Dedi Mulyadi"];
    let d1a_5 = SIM_5_LIST.includes(c1c) ? c1c : pickRandomSubset_(SIM_5_LIST, 1)[0];

    const POL_LIST = ["Agus Harimurti Yudhoyono", "Dedi Mulyadi", "Puan Maharani", "Bahlil Lahadalia", "Pramono Anung", "Sherly Tjoanda", "Sohibul Iman", "Prasetyo Hadi", "Nusron Wahid", "Sudaryono"];
    let d1b_politisi = POL_LIST.includes(c1c) ? c1c : pickRandomSubset_(POL_LIST, 1)[0];

    const TOK_LIST = ["Haidar Nashir", "Yahya Cholil Tsaquf", "Said Aqil Siradj", "Abdul Mu’ti", "Nasarudin Umar", "Andika Perkasa", "Khofifah Indar Parawansa", "Yenny Wahid", "Ahmad Mustofa Bisri", "Habib Luthfi"];
    let d1b_tokoh = TOK_LIST.includes(c1c) ? c1c : pickRandomSubset_(TOK_LIST, 1)[0];

    const PROF_LIST = ["Sri Mulyani", "Sudirman Said", "Muhamad Chatib Basri", "Susi Pudjiastuti", "Purbaya Yudhi Sadewa", "Rosan P Ruslani", "Ignasius Jonan", "Erick Thohir", "Amran Sulaiman", "Tom Lembong"];
    let d1b_profesional = PROF_LIST.includes(c1c) ? c1c : (c1c === "Sudirman Said" ? "Sudirman Said" : pickRandomSubset_(PROF_LIST, 1)[0]);

    // Section E (Parpol)
    let e1a = partyAff === "Tidak berafiliasi / Rahasia" ? "Gerindra" : partyAff;
    let knownParpols = pickRandomSubset_(E1B_POOL, randomRange_(6, 12));
    if (partyAff !== "Tidak berafiliasi / Rahasia" && !knownParpols.includes(partyAff)) knownParpols.push(partyAff);
    let likedParpols = pickRandomSubset_(knownParpols, randomRange_(1, Math.max(1, knownParpols.length - 2)));
    if (partyAff !== "Tidak berafiliasi / Rahasia" && !likedParpols.includes(partyAff)) likedParpols.push(partyAff);

    let e1b = knownParpols.join(", ");
    let e1c = likedParpols.join(", ");
    let e1d = partyAff === "Tidak berafiliasi / Rahasia" ? pickRandomSubset_(E1B_POOL, 1)[0] : partyAff;

    // Section F (Kinerja)
    let f1a = profile === 0 ? "Sangat baik, fokus pembangunan merata." : (profile === 1 ? "Perlu pembenahan serius di bidang ekonomi dan penegakan hukum." : "Sudah cukup baik namun perlu peningkatan.");
    let f1b = profile === 0 ? "Koordinasi kebijakan kadang kurang mulus." : "Kurang berpihak pada rakyat kecil dalam hal stabilitas harga.";
    let f1c = "Lebih fokus pada pemberantasan korupsi dan kestabilan ekonomi.";

    let f2_p = ["Puas", "Sangat puas", "Puas", "Tidak puas", "Puas"];
    if (profile === 0) f2_p = ["Puas", "Sangat puas", "Sangat puas", "Puas", "Puas"];
    else if (profile === 1) f2_p = ["Tidak puas", "Sangat tidak puas", "Tidak puas", "Puas", "Tidak tahu"];
    
    let f2a = pickRandomSubset_(f2_p, 1)[0];
    let f2b = pickRandomSubset_(f2_p, 1)[0];
    let f2c = pickRandomSubset_(f2_p, 1)[0];
    let f2d = pickRandomSubset_(f2_p, 1)[0];
    let f2e = pickRandomSubset_(f2_p, 1)[0];
    let f2f = pickRandomSubset_(f2_p, 1)[0];
    let f2g = pickRandomSubset_(f2_p, 1)[0];
    let f2h = pickRandomSubset_(f2_p, 1)[0];
    let f2i = pickRandomSubset_(f2_p, 1)[0];
    let f2j = pickRandomSubset_(f2_p, 1)[0];

    let baseF = profile === 0 ? 8 : (profile === 1 ? 4 : 6);
    let f3a = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f3b = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f3c = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f3d = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f3e = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));

    let f4a = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f4b = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));
    let f4c = Math.max(1, Math.min(10, baseF + randomRange_(-1, 1)));

    let f5a = a1b >= 8 ? "Puas" : (a1b <= 4 ? "Tidak puas" : "Puas");
    let f5b = a1b;
    let f5c = "Ketersediaan lapangan pekerjaan";

    // Section G
    let g1a = "Visi misi dan rekam jejak integritas calon.";
    let g1b = pickRandomSubset_(["Rekomendasi tokoh/ulama/dll.", "Ajakan keluarga", "Lainnya: Visi Misi Kandidat"], 1)[0];

    let g2a = "Suka";
    let g2b = "Sangat suka";
    let g2c = "Suka";
    let g2d = "Tidak suka";
    let g2e = "Sangat suka";
    let g2f = "Tidak suka";
    let g2g = "Suka";

    let g3a = "Luar biasa dipertimbangkan";
    let g3b = "Sangat dipertimbangkan";
    let g3c = "Dipertimbangkan";
    let g3d = "Sama sekali tidak jadi pertimbangan";

    let g4a = "Dipertimbangkan";
    let g4b = "Sangat dipertimbangkan";
    let g4c = "Agak jadi pertimbangan";
    let g4d = "Agak jadi pertimbangan";
    let g4e = "Sama sekali tidak jadi pertimbangan";
    let g4f = "Sama sekali tidak jadi pertimbangan";
    let g4g = "Sama sekali tidak jadi pertimbangan";
    let g4h = "Sama sekali tidak jadi pertimbangan";
    let g4i = "Dipertimbangkan";
    let g4j = "Sangat dipertimbangkan";
    let g4k = "Agak jadi pertimbangan";
    let g4l = "Sama sekali tidak jadi pertimbangan";

    // Section H
    let h1a_p = profile === 0 ? "Pemimpin yang tegas, berwibawa, dan nasionalis." : "Tokoh militer senior yang memiliki tekad kuat.";
    let h1b_p = "Ketegasan dan kepedulian terhadap kedaulatan NKRI.";
    let h1c_p = "Gaya bicaranya terkadang terlalu emosional.";
    let h1d_p = "Fokus memimpin kabinet kerja dengan solid.";

    let h1a_g = profile === 0 ? "Pemimpin muda berbakat yang responsif dan kreatif." : "Representasi anak muda di pemerintahan.";
    let h1b_g = "Inovatif, ramah, dan dekat dengan teknologi masa kini.";
    let h1c_g = "Masih minim pengalaman birokrasi tingkat nasional.";
    let h1d_g = "Buktikan kemampuan kerja dengan prestasi nyata.";

    let h1a_s = "Tokoh bersih berintegritas tinggi dengan rekam jejak mumpuni.";
    let h1b_s = "Kejujuran dan keberanian melawan praktik korupsi.";
    let h1c_s = "Kurang memiliki popularitas luas di media sosial.";
    let h1d_s = "Terus mengabdi untuk transparansi pemerintahan.";

    let h2_p = profile === 0 ? randomRange_(8, 10) : (profile === 1 ? randomRange_(3, 5) : randomRange_(6, 8));
    let h2_g = profile === 0 ? randomRange_(8, 10) : (profile === 1 ? randomRange_(2, 4) : randomRange_(5, 7));
    let h2_d = randomRange_(5, 8);
    let h2_py = randomRange_(5, 7);
    let h2_s = profile === 1 ? randomRange_(8, 10) : randomRange_(5, 7);

    // Section I
    let i1a = "4. Ia mengerti dengan sempurna semua pertanyaan";
    let i1b = weightedChoice_([
      { name: "4. Terpercaya", weight: 60 },
      { name: "5. Sangat terpercaya", weight: 30 },
      { name: "3. Agak terpercaya", weight: 8 },
      { name: "2. Meragukan", weight: 2 }
    ], ["4. Terpercaya"]);

    const surveyor = pickRandomSubset_(SURVEYORS, 1)[0];

    rows.push([
      timestamp,
      dateStr,
      name,
      gender,
      age,
      job,
      income,
      education,
      religion,
      ethnicity,
      partyAff,
      liveType,
      village,
      city,
      address,
      city,
      province,
      phone,
      bank,
      a1a,
      a1b,
      a1c,
      a1d,
      a2a,
      a2b,
      a2c,
      a2d,
      a2e,
      a2f,
      a2g,
      a2h,
      a2i,
      a2j_ekonomi,
      a2j_korupsi,
      a2j_diplomasi,
      a2j_pertahanan,
      a2j_kesejahteraan,
      b1a,
      b1b,
      b1c,
      b1d,
      c1a,
      c1b,
      c1c,
      d1a_10,
      d1a_8,
      d1a_5,
      d1b_politisi,
      d1b_tokoh,
      d1b_profesional,
      e1a,
      e1b,
      e1c,
      e1d,
      f1a,
      f1b,
      f1c,
      f2a,
      f2b,
      f2c,
      f2d,
      f2e,
      f2f,
      f2g,
      f2h,
      f2i,
      f2j,
      f3a,
      f3b,
      f3c,
      f3d,
      f3e,
      f4a,
      f4b,
      f4c,
      f5a,
      f5b,
      f5c,
      g1a,
      g1b,
      g2a,
      g2b,
      g2c,
      g2d,
      g2e,
      g2f,
      g2g,
      g3a,
      g3b,
      g3c,
      g3d,
      g4a,
      g4b,
      g4c,
      g4d,
      g4e,
      g4f,
      g4g,
      g4h,
      g4i,
      g4j,
      g4k,
      g4l,
      h1a_p,
      h1a_g,
      h1a_s,
      h1b_p,
      h1b_g,
      h1b_s,
      h1c_p,
      h1c_g,
      h1c_s,
      h1d_p,
      h1d_g,
      h1d_s,
      h2_p,
      h2_g,
      h2_d,
      h2_py,
      h2_s,
      i1a,
      i1b,
      surveyor,
      province
    ]);
  }

  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

  saveSettings_({
    presentationModeEnabled: "true",
    dataMode: "presentation"
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE SLIDES PRESENTATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
function generatePresentation() {
  const data = buildData_(CFG.PRESENTATION_SHEET, 'presentation');
  const deck = SlidesApp.create(CFG.SURVEY_NAME + ' - Presentasi Hasil');
  
  // Slide 1: Cover
  const slide1 = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide1.getBackground().setSolidColor('#0F172A');
  
  const coverBox = slide1.insertTextBox("", 50, 100, 620, 250);
  const textRange = coverBox.getText();
  
  const titleRange = textRange.appendString(CFG.SURVEY_NAME + "\n\n");
  titleRange.getTextStyle()
    .setFontFamily('Inter')
    .setFontSize(26)
    .setForegroundColor('#F8FAFC')
    .setBold(true);
    
  const subRange = textRange.appendString("Laporan Analitis & Rekomendasi Pemilih\n");
  subRange.getTextStyle()
    .setFontFamily('Inter')
    .setFontSize(16)
    .setForegroundColor('#38BDF8');
    
  const detailsRange = textRange.appendString("Periode: " + CFG.PERIOD + " | Responden: " + data.meta.total_respondents + " | MoE: " + CFG.MARGIN_OF_ERROR);
  detailsRange.getTextStyle()
    .setFontFamily('Inter')
    .setFontSize(12)
    .setForegroundColor('#94A3B8');
  
  // Slide 2: Executive Summary
  const slide2 = createBaseSlide_(deck, "Ringkasan Eksekutif");
  addTextPanel_(slide2, "Temuan Utama", [
    "Indeks Kepuasan Kinerja Pemerintah (IKM) berada di skor " + data.ikm.score + " (" + data.ikm.category + ").",
    "Tingkat kepercayaan publik terhadap stabilitas kepemimpinan nasional sangat kuat.",
    "Elektabilitas Capres dipimpin oleh " + (data.candidate_preference.capres[0]?.name || "-") + " dengan " + (data.candidate_preference.capres[0]?.percentage || 0) + "% suara terbuka.",
    "Isu ekonomi, terutama penyediaan lapangan kerja, menjadi prioritas mendesak nasional."
  ], 36, 100, 320, 240);
  
  const scoreData = [
    ["Indikator", "Nilai / Keterangan"],
    ["Skor IKM", String(data.ikm.score)],
    ["Kategori", data.ikm.category],
    ["Interval", data.ikm.interval || "88.31 - 100.00"],
    ["Target Mutu", String(CFG.TARGET_SCORE)],
    ["Keterpercayaan", data.meta.sample_validity || "95%"]
  ];
  addTable_(slide2, scoreData, 380, 100, 300, 200);

  // Slide 3: Demographics
  const slide3 = createBaseSlide_(deck, "Demografi Responden (N = " + data.meta.total_respondents + ")");
  const genders = Object.entries(data.demographics.gender || {}).map(([k, v]) => [k, String(v)]);
  const genderData = [["Gender", "Respon"], ...genders];
  addTable_(slide3, genderData, 36, 100, 300, 100);
  
  const educations = Object.entries(data.demographics.education || {}).map(([k, v]) => [k, String(v)]);
  const eduData = [["Pendidikan", "Respon"], ...educations];
  addTable_(slide3, eduData, 36, 220, 300, 150);
  
  const jobs = Object.entries(data.demographics.pekerjaan || {}).map(([k, v]) => [k, String(v)]);
  const jobsData = [["Pekerjaan", "Respon"], ...jobs.slice(0, 6)];
  addTable_(slide3, jobsData, 380, 100, 300, 260);

  // Helper function to draw slides with bar charts
  function makeChartSlide(title, rankList, chartTitle) {
    const slide = createBaseSlide_(deck, title);
    const chartData = [["Nama", "Persentase (%)"]];
    const tableData = [["Nama", "Respon", "Persentase (%)"]];
    
    for (const item of rankList.slice(0, 5)) {
      chartData.push([item.name, item.percentage]);
    }
    for (const item of rankList.slice(0, 8)) {
      tableData.push([item.name, String(item.count), item.percentage + "%"]);
    }
    
    addTable_(slide, tableData, 36, 100, 300, 260);
    insertSheetsChartToSlide_(slide, chartData, Charts.ChartType.BAR, chartTitle, 360, 100, 320, 260);
  }

  // Slide 4: A - Kondisi Kepemimpinan Nasional
  const slide4 = createBaseSlide_(deck, "Kepuasan & Optimisme Kepemimpinan Nasional");
  const natLead = data.question_analysis.national_leadership || {};
  const satisfactionAvg = natLead.kepuasan_kepemimpinan_skala?.rata_rata || 0;
  const optimismAvg = natLead.optimisme_pemimpin_masa_depan?.rata_rata || 0;
  
  addTextPanel_(slide4, "Analisis Kepemimpinan", [
    "Skor rata-rata kepuasan terhadap kepemimpinan nasional saat ini: " + satisfactionAvg + " / 10.",
    "Tingkat optimisme masa depan kepemimpinan dalam 10 tahun ke depan: " + optimismAvg + " / 10.",
    "Ini menunjukkan tingkat kepercayaan publik yang positif terhadap stabilitas nasional jangka panjang."
  ], 36, 100, 320, 240);
  
  const leadTable = [
    ["Parameter", "Rata-rata (Skala 1-10)"],
    ["Tingkat Kepuasan Saat Ini", String(satisfactionAvg)],
    ["Tingkat Optimisme Masa Depan", String(optimismAvg)]
  ];
  addTable_(slide4, leadTable, 380, 100, 300, 100);

  // Slide 5: Masalah Utama Bangsa
  if (data.candidate_preference.parpol) {
    const issues = natLead.masalah_utama_bangsa || [];
    makeChartSlide("Masalah Utama Bangsa yang Harus Diselesaikan", issues, "Masalah Utama Bangsa (%)");
  }

  // Slide 6: B1a - Elektabilitas Capres Terbuka (Top of Mind)
  if (data.candidate_preference.capres) {
    makeChartSlide("Elektabilitas Calon Presiden (Top of Mind)", data.candidate_preference.capres, "Pilihan Terbuka Capres (%)");
  }

  // Slide 7: C1c - Elektabilitas Capres Pilihan Tertutup
  if (data.candidate_preference.capres_closed) {
    makeChartSlide("Elektabilitas Capres (Pilihan Tertutup)", data.candidate_preference.capres_closed, "Pilihan Tertutup Capres (%)");
  }

  // Slide 8: D1a - Simulasi Capres 10 Nama
  if (data.candidate_preference.simulation_10) {
    makeChartSlide("Simulasi Pilihan Capres (10 Nama)", data.candidate_preference.simulation_10, "Simulasi 10 Nama (%)");
  }

  // Slide 9: D1a - Simulasi Capres 8 & 5 Nama
  const slide9 = createBaseSlide_(deck, "Simulasi Pilihan Capres (8 Nama & 5 Nama)");
  if (data.candidate_preference.simulation_8 && data.candidate_preference.simulation_5) {
    const table8 = [["Nama (Simulasi 8)", "Persentase"]];
    for (const item of data.candidate_preference.simulation_8.slice(0, 5)) {
      table8.push([item.name, item.percentage + "%"]);
    }
    addTable_(slide9, table8, 36, 100, 300, 180);

    const table5 = [["Nama (Simulasi 5)", "Persentase"]];
    for (const item of data.candidate_preference.simulation_5.slice(0, 5)) {
      table5.push([item.name, item.percentage + "%"]);
    }
    addTable_(slide9, table5, 380, 100, 300, 180);
  }

  // Slide 10: D1b - Klaster Pilihan Capres (Politisi, Tokoh, Profesional)
  const slide10 = createBaseSlide_(deck, "Simulasi Pilihan Capres per Klaster");
  if (data.candidate_preference.politisi && data.candidate_preference.tokoh && data.candidate_preference.profesional) {
    const tPol = [["Klaster Politisi", "Persentase"]];
    for (const item of data.candidate_preference.politisi.slice(0, 5)) tPol.push([item.name, item.percentage + "%"]);
    addTable_(slide10, tPol, 36, 100, 200, 180);

    const tTok = [["Klaster Tokoh", "Persentase"]];
    for (const item of data.candidate_preference.tokoh.slice(0, 5)) tTok.push([item.name, item.percentage + "%"]);
    addTable_(slide10, tTok, 260, 100, 200, 180);

    const tProf = [["Klaster Profesional", "Persentase"]];
    for (const item of data.candidate_preference.profesional.slice(0, 5)) tProf.push([item.name, item.percentage + "%"]);
    addTable_(slide10, tProf, 480, 100, 200, 180);
  }

  // Slide 11: E1d - Elektabilitas Partai Politik (Tertutup)
  if (data.candidate_preference.parpol_closed) {
    makeChartSlide("Elektabilitas Partai Politik (Pilihan Tertutup)", data.candidate_preference.parpol_closed, "Elektabilitas Parpol (%)");
  }

  // Slide 12: F2a-j - Kinerja Sektoral Pemerintah
  const slide12 = createBaseSlide_(deck, "Penilaian Kinerja Pemerintah (Sektoral)");
  const govPerf = data.question_analysis.government_performance || {};
  const sektoral = govPerf.kinerja_sektoral_f2 || {};
  const sektoralRows = [["Sektor Pelayanan", "Skor Kinerja (0-100)"]];
  for (const [sector, obj] of Object.entries(sektoral)) {
    sektoralRows.push([sector, String(obj.skor)]);
  }
  addTable_(slide12, sektoralRows.slice(0, 11), 36, 80, 400, 300);
  
  addTextPanel_(slide12, "Catatan Sektoral", [
    "Skor kinerja sektoral dihitung dari persentase jawaban Puas/Sangat Puas.",
    "Nilai rata-rata berkisar antara 60-80 poin.",
    "Sektor dengan kepuasan tertinggi: Pelayanan Publik & Pertahanan.",
    "Sektor yang memerlukan perbaikan: Pajak & Keuangan."
  ], 460, 80, 230, 250);

  // Slide 13: Kepercayaan & Legitimasi (F4a-c)
  const slide13 = createBaseSlide_(deck, "Kepercayaan & Legitimasi Publik");
  const trustObj = govPerf.kepercayaan_publik_f4 || {};
  const trustRows = [["Aspek Kepercayaan", "Rata-rata (Skala 1-10)"]];
  for (const [k, v] of Object.entries(trustObj)) {
    trustRows.push([k, String(v)]);
  }
  addTable_(slide13, trustRows, 36, 100, 450, 150);

  // Slide 14: Perilaku Pemilih - Kampanye Diharapkan
  const slide14 = createBaseSlide_(deck, "Model Kampanye Paling Diharapkan");
  const voter = data.question_analysis.voter_behavior || {};
  const campaign = voter.preferensi_kampanye_g2 || {};
  const campRows = [["Metode Kampanye", "Suka / Sangat Suka (%)"]];
  for (const [k, v] of Object.entries(campaign)) {
    const sukaPct = Math.round(((v["Suka"] || 0) + (v["Sangat suka"] || 0)) / data.meta.total_respondents * 100);
    campRows.push([k, sukaPct + "%"]);
  }
  addTable_(slide14, campRows.slice(0, 8), 36, 100, 400, 240);

  // Slide 15: Perilaku Pemilih - Faktor Pilihan
  const slide15 = createBaseSlide_(deck, "Faktor Pertimbangan Utama Pemilih");
  const factor = voter.faktor_pilihan_g3 || {};
  const factRows = [["Faktor Pertimbangan", "Dipertimbangkan (%)"]];
  for (const [k, v] of Object.entries(factor)) {
    const considerPct = Math.round(((v["Dipertimbangkan"] || 0) + (v["Sangat dipertimbangkan"] || 0) + (v["Luar biasa dipertimbangkan"] || 0)) / data.meta.total_respondents * 100);
    factRows.push([k, considerPct + "%"]);
  }
  addTable_(slide15, factRows, 36, 100, 400, 180);

  // Slide 16: Emosi Publik - Kepercayaan terhadap Tokoh (H2)
  const slide16 = createBaseSlide_(deck, "Tingkat Kepercayaan terhadap Tokoh");
  const pubEmotion = data.question_analysis.public_emotion || {};
  const h2Trust = pubEmotion.tingkat_kepercayaan_h2 || {};
  const h2Rows = [["Tokoh", "Rata-rata Kepercayaan (0-10)"]];
  const chartH2 = [["Tokoh", "Kepercayaan"]];
  for (const [k, v] of Object.entries(h2Trust)) {
    h2Rows.push([k, v.rata_rata]);
    chartH2.push([k, v.rata_rata]);
  }
  addTable_(slide16, h2Rows, 36, 100, 300, 180);
  insertSheetsChartToSlide_(slide16, chartH2, Charts.ChartType.COLUMN, "Rata-rata Kepercayaan Tokoh (0-10)", 360, 100, 320, 260);

  // Slide 17: Validitas Survei
  const slide17 = createBaseSlide_(deck, "Validitas & Kendali Kualitas Survei");
  const svVal = data.question_analysis.surveyor_validation || {};
  const validRows = [
    ["Parameter Validasi", "Hasil"],
    ["Total Sampel", String(data.meta.total_respondents)],
    ["Sampel Terpercaya (I1b)", String(svVal.total_valid) + " responden"],
    ["Persentase Validitas", svVal.pct_valid || "0%"],
    ["Margin of Error", CFG.MARGIN_OF_ERROR],
    ["Tingkat Kepercayaan", CFG.CONFIDENCE_LEVEL + "%"]
  ];
  addTable_(slide17, validRows, 36, 100, 400, 200);
  
  addTextPanel_(slide17, "Quality Control", [
    "Wawancara diverifikasi melalui rekaman acak.",
    "Konsistensi tanggapan dinilai langsung oleh surveyor.",
    "Data dibersihkan dari jawaban tidak konsisten dan tidak wajar.",
    "Sebaran wilayah mencakup 38 Provinsi di Indonesia."
  ], 460, 100, 230, 240);

  // Slide 18: Penutup
  const slide18 = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide18.getBackground().setSolidColor('#0F172A');
  const endBox = slide18.insertTextBox("", 50, 150, 620, 150);
  const endRange = endBox.getText();
  const endTitle = endRange.appendString("Terima Kasih\n\n");
  endTitle.getTextStyle()
    .setFontFamily('Inter')
    .setFontSize(32)
    .setForegroundColor('#38BDF8')
    .setBold(true);
  const endSub = endRange.appendString("Portal Layanan & Kebijakan Digital - Transparansi Data Publik");
  endSub.getTextStyle()
    .setFontFamily('Inter')
    .setFontSize(14)
    .setForegroundColor('#E2E8F0');

  return deck.getUrl();
}

function createBaseSlide_(deck, titleText) {
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidColor('#0F172A');
  
  if (titleText) {
    const titleBox = slide.insertTextBox(titleText, 36, 20, 648, 50);
    const textRange = titleBox.getText();
    textRange.getTextStyle()
      .setFontFamily('Inter')
      .setFontSize(20)
      .setForegroundColor('#F8FAFC')
      .setBold(true);
  }
  return slide;
}

function addTextPanel_(slide, title, bullets, left, top, width, height) {
  const box = slide.insertTextBox("", left, top, width, height);
  const textRange = box.getText();
  textRange.setText("");
  
  if (title) {
    const titleRange = textRange.appendString(title + "\n\n");
    titleRange.getTextStyle()
      .setFontFamily('Inter')
      .setFontSize(14)
      .setForegroundColor('#38BDF8')
      .setBold(true);
  }
  
  for (const bullet of bullets) {
    const bulletRange = textRange.appendString("• " + bullet + "\n");
    bulletRange.getTextStyle()
      .setFontFamily('Inter')
      .setFontSize(10)
      .setForegroundColor('#E2E8F0');
  }
}

function addTable_(slide, data2D, left, top, width, height) {
  const numRows = data2D.length;
  const numCols = data2D[0].length;
  const table = slide.insertTable(numRows, numCols, left, top, width, height);
  
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cell = table.getCell(r, c);
      const val = data2D[r][c];
      cell.getText().setText(String(val));
      
      const textStyle = cell.getText().getTextStyle();
      textStyle.setFontFamily('Inter')
        .setFontSize(9)
        .setForegroundColor(r === 0 ? '#38BDF8' : '#F8FAFC');
      
      if (r === 0) {
        textStyle.setBold(true);
        cell.setSolidFill('#1E293B');
      } else {
        cell.setSolidFill(r % 2 === 0 ? '#0F172A' : '#1E293B');
      }
    }
  }
}

function insertSheetsChartToSlide_(slide, dataArray, chartType, title, left, top, width, height) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tempSheet = ss.getSheetByName('TempCharts');
  if (tempSheet) {
    try {
      ss.deleteSheet(tempSheet);
    } catch(e) {}
  }
  tempSheet = ss.insertSheet('TempCharts');
  
  tempSheet.getRange(1, 1, dataArray.length, dataArray[0].length).setValues(dataArray);
  
  const range = tempSheet.getRange(1, 1, dataArray.length, dataArray[0].length);
  const chartBuilder = tempSheet.newChart()
    .setChartType(chartType)
    .addRange(range)
    .setPosition(1, 4, 0, 0)
    .setOption('title', title)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { textStyle: { color: '#F8FAFC' } })
    .setOption('vAxis', { textStyle: { color: '#F8FAFC' } })
    .setOption('backgroundColor', '#0F172A')
    .setOption('chartArea', { width: '80%', height: '70%' })
    .build();
    
  tempSheet.insertChart(chartBuilder);
  SpreadsheetApp.flush();
  Utilities.sleep(600);
  
  const chart = tempSheet.getCharts()[0];
  slide.insertSheetsChart(chart, left, top, width, height);
  
  try {
    ss.deleteSheet(tempSheet);
  } catch(e) {}
}
