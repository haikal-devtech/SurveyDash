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
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Pastikan nama sheet benar.');
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return { headers: (vals[0] || []).map(h => String(h).trim()), rows: [] };
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
