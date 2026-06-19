/**
 * ============================================================
 * GOOGLE APPS SCRIPT — ELECTORAL SURVEY AGGREGATOR
 * Survei Kepemimpinan Nasional dan Elektoral Parpol dan
 * Kandidat Capres Jelang Pilpres 2029
 * ============================================================
 *
 * CARA DEPLOY:
 * 1. Buka Google Apps Script (script.google.com)
 * 2. Paste seluruh kode ini
 * 3. Deploy → New deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy Web App URL → masukkan ke SurveyDash Admin
 *
 * TROUBLESHOOT KOLOM TIDAK TERBACA:
 * Akses URL + ?debug=headers untuk lihat semua nama kolom di sheet.
 * Contoh: https://script.google.com/macros/.../exec?debug=headers
 * Lalu sesuaikan COLUMN_MAP di bawah.
 * ============================================================
 */


// ============================================================
// COLUMN MAP — sesuaikan jika nama kolom di Sheet berbeda
// Key = field internal, Value = teks header kolom di Sheet
// ============================================================
var COLUMN_MAP = {
  // DATA RESPONDEN
  timestamp:              'Timestamp',
  tanggal:                'Tanggal wawancara:',
  nama:                   'Nama:',
  gender:                 'Jenis Kelamin: ',
  umur:                   'Umur:',
  pekerjaan:              'Pekerjaan:',
  penghasilan:            'Penghasilan per bulan',
  pendidikan:             'Pendidikan terakhir : ',
  agama:                  'Agama:',
  suku:                   'Suku/Etnis: ',
  afiliasi_politik:       'Partai Politik / Ormas  : Tuliskan nama partai politik atau organisasi yang anda ikuti',
  tempat_tinggal:         'Tempat Tinggal :       ',
  alamat:                 'Alamat  ',
  kabupaten_kota:         'Kabupaten/Kota',
  provinsi_responden:     'Provinsi',
  no_hp:                  'No HP',
  no_rekening:            'No Rekening/e-wallet/ No HP Responden',

  // BAGIAN A — open
  a1a:  'A1a. Menurut Anda bagaimana kondisi kepemimpinan nasional saat ini?',
  a2a:  'A2a. Bagaimana pendapat Anda tentang kebijakan dan model kepemimpinan pemerintahan Prabowo?',
  a2b:  'A2b. Menurut Anda, apakah kriteria pemimpin yang dibutuhkan untuk kondisi Indonesia saat ini dan mendatang?',
  a2c:  'A2c. Apa yang paling tidak Anda sukai dari pemimpin yang akan datang?',
  a2d:  'A2d. Apa sebaiknya yang harus dilakukan oleh pemimpin mendatang?',
  a2h:  'A2h. Menurut Bapak/Ibu, siapa tokoh yang paling layak menjadi pemimpin nasional Indonesia di masa depan?',
  a2i:  'A2i. Selain nama tersebut, siapa lagi tokoh yang menurut Anda layak menjadi pemimpin nasional?',

  // BAGIAN A — scale/choice
  a1b:  'A1b-A1c. Skala Kepemimpinan Nasional [Seberapa puas Anda terhadap kualitas kepemimpinan nasional Indonesia saat ini?]',
  a1c:  'A1b-A1c. Skala Kepemimpinan Nasional [Seberapa optimis Anda Indonesia akan memiliki pemimpin yang mampu membawa kemajuan dalam 10 tahun ke depan?]',
  a1d:  'A1d. Menurut Anda, masalah utama bangsa yang harus segera diselesaikan pemimpin nasional? (Pilih maksimal 3)',
  a2e:  'A2e. Karakter pemimpin nasional yang paling dibutuhkan Indonesia saat ini? (Pilih maksimal 3)',
  a2f:  'A2f. Apakah Indonesia membutuhkan munculnya tokoh pemimpin nasional baru di luar tokoh-tokoh yang saat ini dikenal publik?',
  a2g:  'A2g. Pemimpin nasional yang ideal menurut Anda berasal dari kalangan mana?',

  // BAGIAN A2j — open per bidang
  a2j_ekonomi:    'A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Ekonomi?',
  a2j_korupsi:    'A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pemberantasan Korupsi?',
  a2j_diplomasi:  'A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Diplomasi Internasional?',
  a2j_pertahanan: 'A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Pertahanan dan Keamanan?',
  a2j_kesra:      'A2j. Siapa tokoh yang menurut anda yang paling unggul dalam bidang Kesejahteraan Rakyat?',

  // BAGIAN B — open
  b1a: 'B1a. Jika Pilpres dilakukan hari ini, Anda memilih calon Presiden siapa?__________,  Apa alasannya?',
  b1b: 'B1b. Apakah saat ini Anda memiliki figur Capres alternatif? Siapa sosok Capres alternatif usulan Anda?',
  b1c: 'B1c. Menurut Anda bagaimana sosok Capres ideal 2029?',
  b1d: 'B1d. Capres ideal menurut Anda merepresentasikan tokoh dari kalangan apa?',

  // BAGIAN C — elektabilitas tertutup
  c1a: 'C1a. Di antara nama Capres berikut, mana saja yang anda tahu/kenal?\n',
  c1b: 'C1b. Di antara nama Capres berikut ini, mana yang Anda suka?\n',
  c1c: 'C1c. Bila Pilpres dilaksanakan hari ini, Anda akan memilih siapa?\n',

  // BAGIAN D — simulasi
  d1a_10: 'D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 10 nama)',
  d1a_8:  'D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 8 nama)',
  d1a_5:  'D1a. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa? (Simulasi pilihan Capres 5 nama)',
  d1b_politisi:    'D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa?  (Simulasi pilihan Capres Klaster Politisi)',
  d1b_tokoh:       'D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa?  (Simulasi pilihan Capres Klaster Tokoh)',
  d1b_profesional: 'D1b. Bila Pilpres dilaksanakan hari ini anda akan memilih siapa?  (Simulasi pilihan Capres Klaster Profesional)',

  // BAGIAN E — parpol
  e1a: 'E1a-open — Jika Pemilu Legislatif dilakukan hari ini, Anda memilih partai apa?',
  e1b: 'E1b. Di antara nama Parpol berikut ini, Parpol mana saja yang Anda tahu?\n',
  e1c: 'E1c. Di antara nama Parpol berikut ini, Parpol mana yang Anda suka?\n',
  e1d: 'E1d. Bila Pemilihan Legislatif dilaksanakan hari ini, Anda akan memilih partai apa?\n',

  // BAGIAN F — open
  f1a: 'F1a. Menurut Anda bagaimana kinerja Pemerintahan Prabowo?',
  f5a: 'F5a. Secara keseluruhan, bagaimana penilaian Anda terhadap kinerja Pemerintahan Prabowo?',
  f5b: 'F5b. Dari skala 1-10, berapa skor yang Anda berikan untuk kinerja Pemerintahan Prabowo?',
  f5c: 'F5c. Menurut Anda, bagaimana kondisi perekonomian Indonesia saat Ini?',
  f5d: 'F5d. Menurut Anda, bagaimana kondisi demokrasi, politik dan hukum Indonesia saat ini?',
  f5e: 'F5e. Menurut Anda, Bagaimana Kondisi kesejahteraan masyarakat Indonesia saat ini?',

  // BAGIAN F3/F4 — grid title prefix (F2 dihapus dari form)
  f3_grid: 'Pertanyaan F3a-F3e',
  f4_grid: 'Pertanyaan F4a-F4c',

  // BAGIAN G
  g1a: 'G1a. Apa pertimbangan Anda dalam memilih pada Pemilu 2029?',
  g1b: 'G1b. Apa pertimbangan utama Anda dalam memilih kandidat di Pemilu 2029? (semi terbuka)',
  g2_grid: 'Pertanyaan G2a-G2g',
  g3_grid: 'Pertanyaan G3a-G3d',

  // BAGIAN D4 — grid kepercayaan 10 tokoh
  d4_grid: 'Pertanyaan D4a-D4j',

  // BAGIAN SURVEYOR
  nama_surveyor:    'Nama Surveyor / Responden',
  provinsi_surveyor: 'Provinsi' // second occurrence (surveyor province)
};

var F3_ROWS = {
  'F3a. Kejelasan visi dan arah kebijakan Pemerintah':                  'Kejelasan visi & arah kebijakan',
  'F3b. Kecepatan pemerintah merespons masalah atau krisis':            'Kecepatan respons masalah/krisis',
  'F3c. Ketegasan pemerintah mengambil keputusan strategis':            'Ketegasan pengambilan keputusan',
  'F3d. Konsistensi antara pernyataan dengan kebijakan yang diambil':   'Konsistensi pernyataan vs kebijakan',
  'F3e. Kemampuan pemerintah mengoordinasikan kebijakan':               'Kemampuan koordinasi kebijakan'
};

var F4_ROWS = {
  'F4a. Tingkat kepercayaan Anda terhadap Pemerintah':                  'Kepercayaan terhadap pemerintah',
  'F4b. Persepsi terhadap integritas dan kejujuran Pemerintah':         'Integritas & kejujuran pemerintah',
  'F4c. Keyakinan bahwa pemerintah bekerja untuk kepentingan rakyat':   'Pemerintah bekerja untuk rakyat'
};

var G2_ROWS = {
  'G2a. Praktik kampanye menggunakan alat peraga':                               'Alat peraga kampanye',
  'G2b. Praktik kampanye menggunakan media sosial (fb, twitter, instagram, path, youtube, tiktok, dll)?': 'Media sosial',
  'G2c. Praktik kampanye rapat terbuka':                                         'Rapat terbuka',
  'G2d. Praktik kampanye rapat tertutup':                                        'Rapat tertutup',
  'G2e. Praktik kampanye bertemu langsung dengan pasangan calon':                'Temu langsung paslon',
  'G2f. Praktik kampanye konvoi di jalanan':                                     'Konvoi jalanan',
  'G2g. Praktik kampanye menggunakan influencer/tokoh':                          'Influencer/tokoh'
};

var G3_ROWS = {
  'G3a. Rekam jejak dan integritas kandidat':                        'Rekam jejak & integritas',
  'G3b. Visi misi / program/  gagasan kandidat':                     'Visi misi & program',
  'G3c. Ketokohan kandidat':                                         'Ketokohan kandidat',
  'G3d. Praktik bagi-bagi uang dan sembako oleh kandidat/tim sukses':'Bagi-bagi uang/sembako'
};

// D2: 6 capres alternatif (open-text D2a-D2d per leader)
var D2_LEADERS = ['Purbaya Yudhi Sadewa', 'Dedi Mulyadi', 'Sudirman Said', 'Chatib Basri', 'Sherly Tjoanda', 'Said Aqil Siradj'];

// D3: 6 tokoh utama (open-text D3a-D3d per leader)
var D3_LEADERS = ['Prabowo Subianto', 'Gibran Rakabuming Raka', 'Anies Baswedan', 'Puan Maharani', 'Agus Harimurti Yudhoyono', 'Bahlil Lahadalia'];

// D4: trust grid 10 tokoh (skala 0-10), row label = "D4x. Nama"
var D4_ROWS = {
  'D4a. Prabowo Subianto':          'Prabowo Subianto',
  'D4b. Gibran Rakabuming Raka':    'Gibran Rakabuming Raka',
  'D4c. Dedi Mulyadi':              'Dedi Mulyadi',
  'D4d. Purbaya Yudhi Sadewa':      'Purbaya Yudhi Sadewa',
  'D4e. Sudirman Said':             'Sudirman Said',
  'D4f. Sherly Tjoanda':            'Sherly Tjoanda',
  'D4g. Said Aqil Siradj':          'Said Aqil Siradj',
  'D4h. Puan Maharani':             'Puan Maharani',
  'D4i. Agus Harimurti Yudhoyono':  'Agus Harimurti Yudhoyono',
  'D4j. Bahlil Lahadalia':          'Bahlil Lahadalia'
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
function doGet(e) {
  try {
    // Debug mode: return column headers so you can verify mapping
    if (e && e.parameter && e.parameter.debug === 'headers') {
      return debugHeaders();
    }

    var result = buildSurveyData();
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: err.toString(),
        stack: err.stack || 'no stack'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// DEBUG: Return all headers + indices
// ============================================================
function debugHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var result = headers.map(function(h, i) {
    return { index: i, header: h.toString() };
  });
  return ContentService
    .createTextOutput(JSON.stringify({ total_columns: headers.length, columns: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// MAIN DATA BUILDER
// ============================================================
function buildSurveyData() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var all   = sheet.getDataRange().getValues();

  if (all.length < 2) return buildDemoData();

  var headers = all[0].map(function(h) { return h.toString(); });
  var rows    = all.slice(1).filter(function(r) {
    return r.some(function(c) { return c !== '' && c !== null && c !== undefined; });
  });
  var total = rows.length;

  // ── Column lookup helpers ──────────────────────────────────────────────────
  // Build a lookup cache: normalized header → [indices]
  var headerIndex = {};
  headers.forEach(function(h, i) {
    var norm = h.trim().toLowerCase();
    if (!headerIndex[norm]) headerIndex[norm] = [];
    headerIndex[norm].push(i);
  });

  // Find first column by exact match, then startsWith, then contains
  function col(key) {
    var target = COLUMN_MAP[key];
    if (!target) return -1;
    var t = target.trim().toLowerCase();

    // exact
    if (headerIndex[t]) return headerIndex[t][0];

    // startsWith
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].trim().toLowerCase().startsWith(t.substring(0, Math.min(t.length, 60)))) return i;
    }

    // contains first 40 chars
    var sub = t.substring(0, 40);
    for (var j = 0; j < headers.length; j++) {
      if (headers[j].toLowerCase().indexOf(sub) !== -1) return j;
    }
    return -1;
  }

  // Find all columns whose header contains substr (for grids)
  function gridCols(gridPrefix, rowLabel) {
    var needle = (gridPrefix + ' [' + rowLabel + ']').trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].trim().toLowerCase() === needle) return i;
    }
    // Fallback: find by row label alone
    var rowLow = rowLabel.trim().toLowerCase().substring(0, 35);
    for (var j = 0; j < headers.length; j++) {
      if (headers[j].toLowerCase().indexOf(rowLow) !== -1) return j;
    }
    return -1;
  }

  // Find column whose header contains BOTH substrings (for D2 per-leader questions)
  function colContaining(s1, s2) {
    var n1 = s1.trim().toLowerCase();
    var n2 = s2.trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].trim().toLowerCase();
      if (h.indexOf(n1) !== -1 && h.indexOf(n2) !== -1) return i;
    }
    return -1;
  }

  // ── Aggregation helpers ────────────────────────────────────────────────────
  function countSingle(colIdx) {
    var counts = {};
    if (colIdx < 0) return counts;
    rows.forEach(function(r) {
      var v = r[colIdx] ? r[colIdx].toString().trim() : '';
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return sortDesc(counts);
  }

  // Checkbox columns: values are comma-separated
  function countMulti(colIdx) {
    var counts = {};
    if (colIdx < 0) return counts;
    rows.forEach(function(r) {
      var v = r[colIdx] ? r[colIdx].toString().trim() : '';
      if (!v) return;
      v.split(',').forEach(function(item) {
        var t = item.trim();
        if (t) counts[t] = (counts[t] || 0) + 1;
      });
    });
    return sortDesc(counts);
  }

  // Scale: returns { avg, dist }
  function countScale(colIdx, minS, maxS) {
    var dist = {};
    for (var s = minS; s <= maxS; s++) dist[String(s)] = 0;
    if (colIdx < 0) return { avg: 0, dist: dist };
    var sum = 0, cnt = 0;
    rows.forEach(function(r) {
      var n = parseFloat(r[colIdx]);
      if (!isNaN(n) && n >= minS && n <= maxS) {
        var k = String(Math.round(n));
        dist[k] = (dist[k] || 0) + 1;
        sum += n; cnt++;
      }
    });
    return { avg: cnt > 0 ? round2(sum / cnt) : 0, dist: dist };
  }

  // Label-based scale (Sangat tidak puas → 1, etc.)
  function countLabelScale(colIdx, labelMap) {
    var counts = {};
    Object.keys(labelMap).forEach(function(k) { counts[k] = 0; });
    if (colIdx < 0) return { avg: 0, dist: counts };
    var sum = 0, cnt = 0;
    rows.forEach(function(r) {
      var v = r[colIdx] ? r[colIdx].toString().trim() : '';
      if (v && counts.hasOwnProperty(v)) {
        counts[v]++;
        var score = labelMap[v];
        if (score > 0) { sum += score; cnt++; }
      }
    });
    return { avg: cnt > 0 ? round2(sum / cnt) : 0, dist: counts };
  }

  // Collect open text (limited)
  function openText(colIdx, limit) {
    limit = limit || 500;
    var out = [];
    if (colIdx < 0) return out;
    rows.forEach(function(r) {
      var v = r[colIdx] ? r[colIdx].toString().trim() : '';
      if (v && out.length < limit) out.push(v);
    });
    return out;
  }

  function sortDesc(obj) {
    var s = {};
    Object.keys(obj).sort(function(a, b) { return obj[b] - obj[a]; })
      .forEach(function(k) { s[k] = obj[k]; });
    return s;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // Label maps
  var KEPUASAN_4  = { 'Sangat tidak puas': 1, 'Tidak puas': 2, 'Puas': 3, 'Sangat puas': 4, 'Tidak tahu': 0 };
  var SUKA_4      = { 'Sangat tidak suka': 1, 'Tidak suka': 2, 'Suka': 3, 'Sangat suka': 4, 'Tidak tahu': 0 };
  var PERTIMB_6   = { 'Sama sekali tidak jadi pertimbangan': 1, 'Agak jadi pertimbangan': 2, 'Dipertimbangkan': 3, 'Sangat dipertimbangkan': 4, 'Luar biasa dipertimbangkan': 5, 'Tidak tahu': 0 };
  var KEPUASAN_F3 = { 'Sangat Tidak Puas': 1, 'Tidak Puas': 2, 'Puas': 3, 'Sangat Puas': 4, 'Tidak Tahu': 0 };
  var PERCAYA_F4  = { 'Sangat Tidak Percaya': 1, 'Tidak Percaya': 2, 'Percaya': 3, 'Sangat Percaya': 4, 'Tidak Tahu': 0 };

  // ── BUILD SECTIONS ─────────────────────────────────────────────────────────

  // DEMOGRAPHICS
  var demographics = {
    gender:           countSingle(col('gender')),
    umur:             countSingle(col('umur')),
    pekerjaan:        countSingle(col('pekerjaan')),
    pendidikan:       countSingle(col('pendidikan')),
    agama:            countSingle(col('agama')),
    penghasilan:      countSingle(col('penghasilan')),
    suku:             countSingle(col('suku')),
    afiliasi_politik: countSingle(col('afiliasi_politik')),
    desa_kota:        countSingle(col('tempat_tinggal')),
    provinsi:         countSingle(col('provinsi_responden'))
  };

  // BAGIAN A — NATIONAL LEADERSHIP
  var national_leadership = {
    a1b_satisfaction: countScale(col('a1b'), 0, 10),
    a1c_optimism:     countScale(col('a1c'), 0, 10),
    a1d_problems:     countMulti(col('a1d')),
    a2e_character:    countMulti(col('a2e')),
    a2f_new_leader:   countSingle(col('a2f')),
    a2g_background:   countSingle(col('a2g')),
    open: {
      a1a:           openText(col('a1a')),
      a2a:           openText(col('a2a')),
      a2b:           openText(col('a2b')),
      a2c:           openText(col('a2c')),
      a2d:           openText(col('a2d')),
      a2h:           openText(col('a2h')),
      a2i:           openText(col('a2i')),
      a2j_ekonomi:   openText(col('a2j_ekonomi')),
      a2j_korupsi:   openText(col('a2j_korupsi')),
      a2j_diplomasi: openText(col('a2j_diplomasi')),
      a2j_pertahanan:openText(col('a2j_pertahanan')),
      a2j_kesra:     openText(col('a2j_kesra'))
    }
  };

  // BAGIAN B+C+D — ELECTABILITY
  var electability = {
    awareness:      countMulti(col('c1a')),
    likability:     countMulti(col('c1b')),
    vote_intention: countSingle(col('c1c')),
    simulation: {
      s10:                countSingle(col('d1a_10')),
      s8:                 countSingle(col('d1a_8')),
      s5:                 countSingle(col('d1a_5')),
      klaster_politisi:   countSingle(col('d1b_politisi')),
      klaster_tokoh:      countSingle(col('d1b_tokoh')),
      klaster_profesional:countSingle(col('d1b_profesional'))
    },
    open: {
      b1a: openText(col('b1a')),
      b1b: openText(col('b1b')),
      b1c: openText(col('b1c')),
      b1d: openText(col('b1d'))
    }
  };

  // BAGIAN E — PARTY
  var party = {
    awareness:      countMulti(col('e1b')),
    likability:     countMulti(col('e1c')),
    vote_intention: countSingle(col('e1d')),
    open_e1a:       openText(col('e1a'))
  };

  // BAGIAN F — GOV PERFORMANCE
  var f3GridPrefix = COLUMN_MAP['f3_grid'];
  var f4GridPrefix = COLUMN_MAP['f4_grid'];

  var f3 = {};
  Object.keys(F3_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(f3GridPrefix, rowLabel);
    f3[F3_ROWS[rowLabel]] = countLabelScale(cIdx, KEPUASAN_F3);
  });

  var f4 = {};
  Object.keys(F4_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(f4GridPrefix, rowLabel);
    f4[F4_ROWS[rowLabel]] = countLabelScale(cIdx, PERCAYA_F4);
  });

  var gov_performance = {
    f3_leadership: f3,
    f4_trust:      f4,
    f5b_score:     countScale(col('f5b'), 1, 10),
    open: {
      f1a: openText(col('f1a')),
      f5a: openText(col('f5a')),
      f5c: openText(col('f5c')),
      f5d: openText(col('f5d')),
      f5e: openText(col('f5e'))
    }
  };

  // BAGIAN G — VOTER BEHAVIOR
  var g2GridPrefix = COLUMN_MAP['g2_grid'];
  var g3GridPrefix = COLUMN_MAP['g3_grid'];

  var g2 = {};
  Object.keys(G2_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(g2GridPrefix, rowLabel);
    g2[G2_ROWS[rowLabel]] = countLabelScale(cIdx, SUKA_4);
  });

  var g3 = {};
  Object.keys(G3_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(g3GridPrefix, rowLabel);
    g3[G3_ROWS[rowLabel]] = countLabelScale(cIdx, PERTIMB_6);
  });

  var voter_behavior = {
    g1b:         countMulti(col('g1b')),
    g2_campaign: g2,
    g3_factors:  g3,
    open_g1a:    openText(col('g1a'))
  };

  // BAGIAN D2 — EMOSI PUBLIK per capres alternatif (D2a-D2d open text)
  var allLeaders = {};
  D2_LEADERS.forEach(function(leader) {
    allLeaders[leader] = {
      opinion:  openText(colContaining('D2a.', leader), 300),
      liked:    openText(colContaining('D2b.', leader), 300),
      disliked: openText(colContaining('D2c.', leader), 300),
      action:   openText(colContaining('D2d.', leader), 300)
    };
  });

  // BAGIAN D3 — EMOSI PUBLIK per tokoh utama (D3a-D3d open text)
  D3_LEADERS.forEach(function(leader) {
    allLeaders[leader] = {
      opinion:  openText(colContaining('D3a.', leader), 300),
      liked:    openText(colContaining('D3b.', leader), 300),
      disliked: openText(colContaining('D3c.', leader), 300),
      action:   openText(colContaining('D3d.', leader), 300)
    };
  });

  // BAGIAN D4 — kepercayaan 10 tokoh (trust grid skala 0-10)
  var d4GridPrefix = COLUMN_MAP['d4_grid'];
  var d4 = {};
  Object.keys(D4_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(d4GridPrefix, rowLabel);
    d4[D4_ROWS[rowLabel]] = countScale(cIdx, 0, 10);
  });

  var public_emotion = { h1: allLeaders, h2_trust: d4 };

  // SURVEYOR — distribusi nama surveyor
  var surveyor_names = countSingle(col('nama_surveyor'));

  // RESPONDENTS — individual records (max 2500)
  var respondents = rows.slice(0, 2500).map(function(r, i) {
    return {
      id:                   'R' + (i + 1),
      timestamp:            r[0] ? r[0].toString() : '',
      name:                 getCellVal(r, col('nama')),
      gender:               getCellVal(r, col('gender')),
      umur:                 getCellVal(r, col('umur')),
      pekerjaan:            getCellVal(r, col('pekerjaan')),
      pendidikan:           getCellVal(r, col('pendidikan')),
      agama:                getCellVal(r, col('agama')),
      suku:                 getCellVal(r, col('suku')),
      penghasilan:          getCellVal(r, col('penghasilan')),
      afiliasi_politik:     getCellVal(r, col('afiliasi_politik')),
      desa_kota:            getCellVal(r, col('tempat_tinggal')),
      provinsi:             getCellVal(r, col('provinsi_responden')),
      location:             getCellVal(r, col('kabupaten_kota')),
      surveyor:             getCellVal(r, col('nama_surveyor')),
      answers: {
        c1c_vote:    getCellVal(r, col('c1c')),
        e1d_party:   getCellVal(r, col('e1d')),
        a2f_new_leader: getCellVal(r, col('a2f')),
        f5b_score:   getCellVal(r, col('f5b'))
      }
    };
  });

  function getCellVal(row, idx) {
    if (idx < 0 || idx >= row.length) return '';
    return row[idx] !== null && row[idx] !== undefined ? row[idx].toString().trim() : '';
  }

  // ── FINAL RESPONSE ─────────────────────────────────────────────────────────
  return {
    meta: {
      survey_name:       'Survei Kepemimpinan Nasional dan Elektoral Parpol dan Kandidat Capres Jelang Pilpres 2029',
      period:            new Date().getFullYear().toString(),
      total_respondents: total,
      last_updated:      new Date().toISOString(),
      survey_type:       'ELECTORAL'
    },
    demographics:       demographics,
    national_leadership:national_leadership,
    electability:       electability,
    party:              party,
    gov_performance:    gov_performance,
    voter_behavior:     voter_behavior,
    public_emotion:     public_emotion,
    surveyor_names:     surveyor_names,

    // Backward compat dengan SurveyData lama (biar ga error di frontend)
    ikm:        null,
    indicators: [],
    open_ended: {
      general_opinion: gov_performance.open.f1a.slice(0, 100),
      expectations:    gov_performance.open.f5c.slice(0, 100)
    },
    respondents: respondents
  };
}

// ============================================================
// DEMO DATA — dipakai saat sheet masih kosong / belum ada responden
// Sudirman Said sedikit unggul, semua kandidat tetap punya suara
// ============================================================
function buildDemoData() {
  var N = 150; // total demo respondents

  // Helper: distribute N into buckets by weight array, returns { label: count }
  function dist(labels, weights) {
    var total = weights.reduce(function(a,b){return a+b;},0);
    var out = {};
    var used = 0;
    for (var i = 0; i < labels.length; i++) {
      var n = (i === labels.length - 1)
        ? N - used
        : Math.round(N * weights[i] / total);
      out[labels[i]] = n;
      used += n;
    }
    return out;
  }

  // Helper: scale result (0-10)
  function scaleResult(avg, spread) {
    var d = {};
    for (var s = 0; s <= 10; s++) {
      var distance = Math.abs(s - avg);
      d[String(s)] = Math.max(0, Math.round(N * (1 / (1 + distance * distance * spread))));
    }
    // Normalize to N
    var sum = Object.keys(d).reduce(function(a,k){return a+d[k];},0);
    var diff = N - sum;
    d[String(Math.round(avg))] += diff;
    return { avg: Math.round(avg * 100) / 100, dist: d };
  }

  // Helper: label scale (4-option kepuasan)
  function labelScale4(dist_obj) {
    var scoreMap = { 'Sangat tidak puas':1,'Tidak puas':2,'Puas':3,'Sangat puas':4,'Tidak tahu':0 };
    var sum = 0, cnt = 0;
    Object.keys(scoreMap).forEach(function(k){ if(scoreMap[k]>0){ sum += (dist_obj[k]||0)*scoreMap[k]; cnt += (dist_obj[k]||0); } });
    return { avg: cnt>0 ? Math.round(sum/cnt*100)/100 : 0, dist: dist_obj };
  }
  // Helper: label scale F3 (kepuasan)
  function labelScaleF3(dist_obj) {
    var scoreMap = { 'Sangat Tidak Puas':1,'Tidak Puas':2,'Puas':3,'Sangat Puas':4,'Tidak Tahu':0 };
    var sum = 0, cnt = 0;
    Object.keys(scoreMap).forEach(function(k){ if(scoreMap[k]>0){ sum += (dist_obj[k]||0)*scoreMap[k]; cnt += (dist_obj[k]||0); } });
    return { avg: cnt>0 ? Math.round(sum/cnt*100)/100 : 0, dist: dist_obj };
  }
  // Helper: label scale F4 (kepercayaan)
  function labelScaleF4(dist_obj) {
    var scoreMap = { 'Sangat Tidak Percaya':1,'Tidak Percaya':2,'Percaya':3,'Sangat Percaya':4,'Tidak Tahu':0 };
    var sum = 0, cnt = 0;
    Object.keys(scoreMap).forEach(function(k){ if(scoreMap[k]>0){ sum += (dist_obj[k]||0)*scoreMap[k]; cnt += (dist_obj[k]||0); } });
    return { avg: cnt>0 ? Math.round(sum/cnt*100)/100 : 0, dist: dist_obj };
  }

  // Nama persis dari form C1a/C1b/C1c (31 + Yang lain)
  var CAPRES_FULL = [
    'Prabowo Subianto','Gibran Rakabuming Raka','Agus Harimurti Yudhoyono',
    'Pramono Anung','Purbaya Yudhi Sadewa','Anies Baswedan','Dedi Mulyadi',
    'Bahlil Lahadalia','Khofifah Indar Parawansa','Abdul Muhaimin Iskandar',
    'Anis Matta','Erick Thohir','Muhamad Chatib Basri','Mahfud MD',
    'Puan Maharani','Sherly Tjoanda','Surya Paloh','Muhamad Mardiono',
    'Anas Urbaningrum','Yusril Ihza Mahendra','Zulkifli Hasan',
    'Muhammad Sohibul Iman','Sudirman Said','Andika Perkasa',
    'Sudaryono','Nasaruddin Umar','Yenny Wahid','Sri Mulyani',
    'Amran Sulaiman','Ignasius Johan','Yang lain:'
  ];

  // Simulasi D1a — nama persis dari form
  var SIM_10 = ['Prabowo Subianto','Gibran Rakabuming Raka','Agus Harimurti Yudhoyono',
    'Pramono Anung','Purbaya Yudhi Sadewa','Anies Baswedan','Dedi Mulyadi',
    'Bahlil Lahadalia','Khofifah Indar Parawansa','Puan Maharani'];
  var SIM_8  = ['Prabowo Subianto','Gibran Rakabuming Raka','Agus Harimurti Yudhoyono',
    'Pramono Anung','Purbaya Yudhi Sadewa','Anies Baswedan','Dedi Mulyadi',
    'Khofifah Indar Parawansa'];
  var SIM_5  = ['Prabowo Subianto','Gibran Rakabuming Raka','Agus Harimurti Yudhoyono',
    'Purbaya Yudhi Sadewa','Dedi Mulyadi'];

  // Klaster Politisi
  var KLAS_POL = ['Agus Harimurti Yudhoyono','Dedi Mulyadi','Puan Maharani',
    'Bahlil Lahadalia','Pramono Anung','Sherly Tjoanda','Sohibul Iman',
    'Prasetyo Hadi','Nusron Wahid','Sudaryono'];

  // Klaster Tokoh
  var KLAS_TOK = ['Haidar Nashir','Yahya Cholil Tsaquf','Said Aqil Siradj',
    'Abdul Mu\'ti','Nasarudin Umar','Andika Perkasa','Khofifah Indar Parawansa',
    'Yenny Wahid','Ahmad Mustofa Bisri','Habib Luthfi'];

  // Klaster Profesional — Sudirman Said #1
  var KLAS_PRO = ['Sri Mulyani','Sudirman Said','Muhamad Chatib Basri',
    'Susi Pudjiastuti','Purbaya Yudhi Sadewa','Rosan P Ruslani',
    'Ignasius Jonan','Erick Thohir','Amran Sulaiman','Tom Lembong'];

  // Parpol persis dari form E1b/E1c/E1d
  var PARPOL = ['PKB','Partai Gerindra','PDI Perjuangan','Partai Golkar',
    'Partai NasDem','Partai Buruh','Partai Gelora','PKS','PKN','Partai Hanura',
    'Partai Garuda','PAN','PBB','Partai Demokrat','PSI','Partai Perindo',
    'PPP','Partai Umat','Berkarya','Partai Gerakan Rakyat','Parta Gema Indonesia',
    'Partai Rakyat Indonesia','Partai Perubahan','Lainnya: ............'];

  return {
    meta: {
      survey_name: 'Survei Kepemimpinan Nasional dan Elektoral Parpol dan Kandidat Capres Jelang Pilpres 2029',
      period: new Date().getFullYear().toString(),
      total_respondents: N,
      last_updated: new Date().toISOString(),
      survey_type: 'ELECTORAL',
      is_demo: true
    },

    demographics: {
      gender:           dist(['Laki-laki','Perempuan'], [55,45]),
      umur:             dist(['17-30','31-40','41-50','51-70'], [30,35,22,13]),
      pekerjaan:        dist(['Ibu Rumah Tangga','Wiraswasta','Petani','Nelayan','PNS','Buruh/Karyawan','Mahasiswa','Pelajar','Yang lain'], [12,20,10,4,15,22,8,5,4]),
      pendidikan:       dist(['SD','SMP/MTs/SLTP','SMA/SMK/MA/SLTA','Diploma I/II/III/IV','Strata I/II/III','Yang lain'], [5,10,40,12,30,3]),
      agama:            dist(['Islam','Protestan','Katolik','Hindu','Buddha','Konghucu','Yang lain'], [84,7,4,2,1,1,1]),
      penghasilan:      dist(['≤ Rp1.000.000','Rp1.000.001 – Rp3.000.000','Rp3.000.001 – Rp5.000.000','Rp5.000.001 – Rp10.000.000','Yang lain'], [12,30,28,22,8]),
      suku:             dist(['Jawa','Sunda','Betawi','Melayu','Batak','Minang','Dayak','Bugis','Asmat','Timur','Yang lain'], [32,16,8,6,10,8,4,6,2,3,5]),
      afiliasi_politik: dist(['PKS','Gerindra','PDIP','Golkar','PKB','Nasdem','NU','Muhammadiyah','Tidak Ada','Lainnya'], [12,9,11,8,7,5,10,8,28,12]),
      desa_kota:        dist(['Kota','Desa'], [62,38]),
      provinsi:         dist(['DKI Jakarta','Jawa Barat','Jawa Tengah','Jawa Timur','Sumatera Utara','Sulawesi Selatan','Lainnya'], [18,22,18,16,10,8,8])
    },

    national_leadership: {
      a1b_satisfaction: scaleResult(5.8, 0.18),
      a1c_optimism:     scaleResult(6.2, 0.15),
      a1d_problems: dist(
        ['Lapangan kerja','Kesehatan','Harga kebutuhan pokok','Ketimpangan sosial','Korupsi',
         'Infrastruktur','Kemiskinan','Utang negara','Pendidikan','Keamanan'],
        [28,18,32,15,25,14,22,10,18,8]
      ),
      a2e_character: dist(
        ['Jujur dan bersih','Nasionalis','Mampu mengelola ekonomi','Tegas','Berani melawan korupsi',
         'Dekat dengan rakyat','Merakyat','Berpengalaman','Mampu menjaga stabilitas politik',
         'Religius','Visioner','Mampu menjaga keamanan nasional'],
        [38,15,28,22,30,24,20,18,14,12,16,10]
      ),
      a2f_new_leader: dist(['Sangat perlu','Perlu','Kurang perlu','Tidak perlu','Tidak tahu'], [35,38,14,8,5]),
      a2g_background: dist(
        ['Politisi','Pegusaha','Kepala daerah','Akademisi','Menteri','Tokoh agama','TNI/Polri','Aktivis masyarakat'],
        [20,18,28,15,14,16,12,8]
      ),
      open: {
        a1a: ['Kepemimpinan nasional masih perlu pembenahan','Dibutuhkan figur yang benar-benar merakyat','Banyak janji yang belum terealisasi'],
        a2a: ['Kinerjanya terasa tapi perlu konsistensi','Ada kemajuan di infrastruktur','Masih ada PR besar di ekonomi rakyat kecil'],
        a2b: ['Harus jujur dan tidak korup','Dekat dengan rakyat dan memahami kebutuhan daerah','Tegas tapi tetap humanis'],
        a2c: ['Terlalu elitis','Kurang transparan','Janji kampanye tidak terealisasi semua'],
        a2d: ['Fokus pada ekonomi rakyat kecil','Perkuat pemberantasan korupsi','Pemerataan pembangunan luar Jawa'],
        a2h: ['Sudirman Said','Anies Baswedan','Purbaya Yudhi Sadewa'],
        a2i: ['Bahlil Lahadalia','Erick Thohir','Tokoh daerah yang belum dikenal luas'],
        a2j_ekonomi:    ['Muhamad Chatib Basri','Erick Thohir','Sudirman Said'],
        a2j_korupsi:    ['Sudirman Said','Anies Baswedan','KPK independen'],
        a2j_diplomasi:  ['Prabowo Subianto','Anies Baswedan','Sudirman Said'],
        a2j_pertahanan: ['Prabowo Subianto','Agus Harimurti Yudhoyono','Andika Perkasa'],
        a2j_kesra:      ['Khofifah Indar Parawansa','Dedi Mulyadi','Sudirman Said']
      }
    },

    electability: {
      awareness: (function(){
        var aw = [148,145,138,115,98,140,132,95,105,90,70,125,80,118,108,62,85,55,72,98,88,72,102,88,
                  70,65,80,110,75,68,0];
        var out = {};
        CAPRES_FULL.forEach(function(c,i){ out[c] = aw[i] || 0; });
        return out;
      })(),
      likability: dist(CAPRES_FULL,
        [22,18,16,12,14,24,19,8,11,7,4,10,5,8,7,4,3,2,3,4,4,4,20,7,5,4,6,8,4,3,3]),
      vote_intention: dist(CAPRES_FULL,
        [22,18,16,12,14,24,19,8,11,7,4,10,5,8,7,4,3,2,3,4,4,4,20,7,5,4,6,8,4,3,3]),
      simulation: {
        s10: dist(SIM_10, [28,22,20,15,17,30,24,8,12,8]),
        s8:  dist(SIM_8,  [30,24,22,18,19,33,26,15]),
        s5:  dist(SIM_5,  [35,28,24,22,28]),
        klaster_politisi:   dist(KLAS_POL, [38,32,18,14,22,10,12,8,6,5]),
        klaster_tokoh:      dist(KLAS_TOK, [18,14,16,14,10,24,22,13,10,16]),
        klaster_profesional:dist(KLAS_PRO, [32,48,20,25,18,8,12,18,9,14])
      },
      open: {
        b1a: ['Sudirman Said, karena integritas dan rekam jejaknya','Anies Baswedan karena dianggap cerdas dan berpengalaman','Dedi Mulyadi karena dekat dengan rakyat'],
        b1b: ['Ada, Purbaya Yudhi Sadewa sebagai alternatif teknokrat','Agus Harimurti Yudhoyono juga patut dipertimbangkan','Belum ada figur yang benar-benar meyakinkan'],
        b1c: ['Capres ideal harus jujur, dekat rakyat, dan berpengalaman memimpin daerah','Tidak harus dari partai besar, yang penting rekam jejaknya bersih','Figur yang mau turun langsung ke lapangan'],
        b1d: ['Tokoh profesional bersih','Kepala daerah berpengalaman','Pemimpin yang tidak bergantung oligarki']
      }
    },

    party: {
      awareness: (function(){
        var paw = [142,148,145,140,130,85,78,138,60,80,65,125,70,135,95,88,110,62,55,48,45,42,40,30];
        var out = {};
        PARPOL.forEach(function(p,i){ out[p] = paw[i] || 40; });
        return out;
      })(),
      likability:     dist(PARPOL, [16,18,17,14,12,4,3,14,2,3,2,10,2,14,5,4,5,2,1,1,1,1,1,4]),
      vote_intention: dist(PARPOL, [15,17,16,13,11,3,3,13,2,2,2,9,2,13,5,4,5,2,1,1,1,1,1,5]),
      open_e1a: ['PKB','PDI Perjuangan','Belum tau','PKS','Partai Demokrat']
    },

    gov_performance: {
      f3_leadership: {
        'Kejelasan visi & arah kebijakan':    labelScaleF3({'Sangat Tidak Puas':12,'Tidak Puas':35,'Puas':75,'Sangat Puas':22,'Tidak Tahu':6}),
        'Kecepatan respons masalah/krisis':   labelScaleF3({'Sangat Tidak Puas':18,'Tidak Puas':42,'Puas':68,'Sangat Puas':16,'Tidak Tahu':6}),
        'Ketegasan pengambilan keputusan':    labelScaleF3({'Sangat Tidak Puas':10,'Tidak Puas':30,'Puas':80,'Sangat Puas':25,'Tidak Tahu':5}),
        'Konsistensi pernyataan vs kebijakan':labelScaleF3({'Sangat Tidak Puas':20,'Tidak Puas':48,'Puas':62,'Sangat Puas':14,'Tidak Tahu':6}),
        'Kemampuan koordinasi kebijakan':     labelScaleF3({'Sangat Tidak Puas':15,'Tidak Puas':38,'Puas':72,'Sangat Puas':20,'Tidak Tahu':5})
      },
      f4_trust: {
        'Kepercayaan terhadap pemerintah':    labelScaleF4({'Sangat Tidak Percaya':14,'Tidak Percaya':40,'Percaya':70,'Sangat Percaya':20,'Tidak Tahu':6}),
        'Integritas & kejujuran pemerintah':  labelScaleF4({'Sangat Tidak Percaya':20,'Tidak Percaya':48,'Percaya':62,'Sangat Percaya':14,'Tidak Tahu':6}),
        'Pemerintah bekerja untuk rakyat':    labelScaleF4({'Sangat Tidak Percaya':16,'Tidak Percaya':42,'Percaya':68,'Sangat Percaya':18,'Tidak Tahu':6})
      },
      f5b_score: scaleResult(5.9, 0.15),
      open: {
        f1a: ['Cukup baik tapi belum optimal di sektor ekonomi','Ada kemajuan tapi belum merata','Infrastruktur meningkat, tapi daya beli masyarakat turun'],
        f5a: ['Kinerjanya 6 dari 10, masih perlu banyak perbaikan','Sudah ada usaha tapi hasil belum dirasakan rakyat kecil','Perlu lebih konsisten antara ucapan dan kebijakan'],
        f5c: ['Kondisi ekonomi masih berat, harga naik terus','Daya beli masyarakat menurun','Pertumbuhan ekonomi belum dirasakan merata'],
        f5d: ['Demokrasi perlu diperkuat dari dalam','Kebebasan berpendapat masih perlu dijaga','Penegakan hukum belum konsisten'],
        f5e: ['Kesenjangan sosial masih tinggi','Bantuan sosial sudah membantu tapi belum cukup','Perlu perhatian lebih ke daerah terpencil']
      }
    },

    voter_behavior: {
      g1b: dist(
        ['Ajakan keluarga','Rekomendasi tokoh/ulama/dll.','Ajakan Birokrat / ASN','Ajakan Ormas',
         'Ajakan politisi / pengurus partai/timses','Pengusaha','Pemberian uang/barang/jasa','Yang lain:'],
        [55,38,12,18,20,8,15,10]
      ),
      g2_campaign: {
        'Alat peraga kampanye': { avg: 2.8, dist: {'Sangat tidak suka':20,'Tidak suka':45,'Suka':65,'Sangat suka':20,'Tidak tahu':0} },
        'Media sosial':         { avg: 3.1, dist: {'Sangat tidak suka':12,'Tidak suka':30,'Suka':78,'Sangat suka':25,'Tidak tahu':5} },
        'Rapat terbuka':        { avg: 2.9, dist: {'Sangat tidak suka':15,'Tidak suka':42,'Suka':70,'Sangat suka':18,'Tidak tahu':5} },
        'Rapat tertutup':       { avg: 2.6, dist: {'Sangat tidak suka':25,'Tidak suka':50,'Suka':55,'Sangat suka':15,'Tidak tahu':5} },
        'Temu langsung paslon':  { avg: 3.3, dist: {'Sangat tidak suka':8,'Tidak suka':22,'Suka':82,'Sangat suka':33,'Tidak tahu':5} },
        'Konvoi jalanan':       { avg: 2.2, dist: {'Sangat tidak suka':40,'Tidak suka':55,'Suka':40,'Sangat suka':10,'Tidak tahu':5} },
        'Influencer/tokoh':     { avg: 2.7, dist: {'Sangat tidak suka':22,'Tidak suka':48,'Suka':60,'Sangat suka':15,'Tidak tahu':5} }
      },
      g3_factors: {
        'Rekam jejak & integritas': { avg: 4.2, dist: {'Sama sekali tidak jadi pertimbangan':2,'Agak jadi pertimbangan':8,'Dipertimbangkan':25,'Sangat dipertimbangkan':65,'Luar biasa dipertimbangkan':45,'Tidak tahu':5} },
        'Visi misi & program':      { avg: 3.9, dist: {'Sama sekali tidak jadi pertimbangan':3,'Agak jadi pertimbangan':12,'Dipertimbangkan':32,'Sangat dipertimbangkan':60,'Luar biasa dipertimbangkan':38,'Tidak tahu':5} },
        'Ketokohan kandidat':       { avg: 3.5, dist: {'Sama sekali tidak jadi pertimbangan':8,'Agak jadi pertimbangan':20,'Dipertimbangkan':40,'Sangat dipertimbangkan':52,'Luar biasa dipertimbangkan':25,'Tidak tahu':5} },
        'Bagi-bagi uang/sembako':   { avg: 1.6, dist: {'Sama sekali tidak jadi pertimbangan':75,'Agak jadi pertimbangan':35,'Dipertimbangkan':20,'Sangat dipertimbangkan':10,'Luar biasa dipertimbangkan':5,'Tidak tahu':5} }
      },
      open_g1a: ['Rekam jejak yang bersih dan terbukti','Program yang pro rakyat kecil','Tidak ada hubungan dengan oligarki']
    },

    public_emotion: {
      h1: {
        'Purbaya Yudhi Sadewa': {
          opinion:  ['Teknokrat handal dengan rekam jejak profesional','Figur yang tenang namun tegas dalam kebijakan fiskal','Perlu lebih dikenal masyarakat luas'],
          liked:    ['Kompetensinya di bidang ekonomi','Rekam jejak bersih di pemerintahan','Pendekatan berbasis data'],
          disliked: ['Kurang dikenal publik umum','Belum punya basis massa yang kuat','Perlu pengalaman politik lebih banyak'],
          action:   ['Tingkatkan visibilitas di media','Perkuat komunikasi ke masyarakat akar rumput','Tunjukkan komitmen di luar bidang ekonomi']
        },
        'Dedi Mulyadi': {
          opinion:  ['Figur yang dekat dengan rakyat dan merakyat','Membuktikan diri sebagai pemimpin daerah yang efektif','Populer di Jawa Barat'],
          liked:    ['Cara komunikasinya yang langsung ke rakyat','Keberhasilannya di Jawa Barat','Ketegasannya dalam menindak masalah daerah'],
          disliked: ['Belum teruji di level nasional','Masih butuh pengalaman diplomasi','Perlu tim yang lebih solid untuk skala nasional'],
          action:   ['Perluas pengalaman ke isu nasional','Bangun koalisi dengan tokoh daerah lain','Tunjukkan kapabilitas di bidang ekonomi dan luar negeri']
        },
        'Sudirman Said': {
          opinion:  ['Figur yang jujur dan berintegritas','Rekam jejaknya sangat baik','Berani bersuara walau berisiko'],
          liked:    ['Integritasnya yang tidak tergoyahkan','Keberanian menghadapi kepentingan oligarki','Rekam jejak bersih sepanjang karir'],
          disliked: ['Kurang dikenal di lapisan masyarakat bawah','Perlu strategi komunikasi yang lebih masif','Belum punya mesin politik yang kuat'],
          action:   ['Perkuat jaringan ke daerah','Tingkatkan visibilitas di media','Bangun koalisi dengan tokoh reformis lain']
        },
        'Chatib Basri': {
          opinion:  ['Ekonom terkemuka dengan rekam jejak internasional','Bijak dan pragmatis dalam kebijakan','Figur yang dihormati kalangan profesional'],
          liked:    ['Kedalaman pemahaman ekonominya','Pengalaman internasionalnya','Kemampuan komunikasi yang baik'],
          disliked: ['Terlalu teknokrat, kurang menyentuh rakyat bawah','Belum punya basis dukungan politik','Perlu strategi untuk menjangkau pemilih biasa'],
          action:   ['Perkuat citra sebagai calon pemimpin, bukan hanya penasihat','Bangun hubungan dengan kelompok masyarakat','Tunjukkan visi sosial yang lebih konkret']
        },
        'Sherly Tjoanda': {
          opinion:  ['Pemimpin perempuan yang menginspirasi dari Indonesia Timur','Membuktikan kepemimpinan di Papua Barat','Representasi penting untuk keberagaman Indonesia'],
          liked:    ['Keberaniannya sebagai perempuan di wilayah maskulin','Fokusnya pada pembangunan daerah terpencil','Representasi Indonesia Timur'],
          disliked: ['Kurang dikenal di Jawa yang padat pemilih','Perlu memperluas jaringan nasional','Masih perlu membangun mesin politik'],
          action:   ['Tingkatkan visibilitas di media nasional','Bangun koalisi lintas daerah','Tunjukkan agenda nasional yang jelas']
        },
        'Said Aqil Siradj': {
          opinion:  ['Tokoh agama berpengaruh dengan basis NU yang besar','Jembatan antara Islam tradisional dan modernitas','Dihormati di kalangan pesantren'],
          liked:    ['Pengaruhnya di komunitas NU','Pendekatan Islam moderat dan toleran','Pengalaman organisasi yang luas'],
          disliked: ['Terlalu identik dengan satu kelompok agama saja','Perlu memperluas citra ke pemilih non-NU','Harus tunjukkan kapabilitas pemerintahan'],
          action:   ['Tunjukkan visi kepemimpinan yang lintas kelompok','Bangun program konkret untuk semua segmen','Pertegas posisi dalam isu ekonomi dan hukum']
        }
      },
        'Prabowo Subianto': {
          opinion:  ['Pemimpin yang tegas dan berpengalaman di bidang pertahanan','Sudah terbukti dalam menjaga stabilitas keamanan','Perlu lebih perhatian ke ekonomi rakyat kecil'],
          liked:    ['Ketegasannya dalam memimpin','Pengalamannya di militer dan pemerintahan','Komitmen terhadap kedaulatan negara'],
          disliked: ['Gaya komunikasi yang terkadang kurang merakyat','Perlu lebih transparan soal kebijakan ekonomi','Kurang melibatkan anak muda'],
          action:   ['Lebih fokus ke kesejahteraan rakyat kecil','Perkuat pemberantasan korupsi','Jaga stabilitas politik dan keamanan']
        },
        'Gibran Rakabuming Raka': {
          opinion:  ['Masih muda dan perlu banyak pengalaman','Diuntungkan dari nama keluarga','Perlu buktikan diri lebih banyak'],
          liked:    ['Semangat dan energi anak muda','Program digitalisasi yang menarik','Inovatif dalam beberapa kebijakan daerah'],
          disliked: ['Kurang pengalaman di level nasional','Terlalu bergantung pada warisan politik keluarga','Perlu belajar lebih banyak'],
          action:   ['Perbanyak program pro rakyat','Tunjukkan kemandirian dari orang tua','Fokus pada kebijakan yang terukur dan berdampak']
        },
        'Anies Baswedan': {
          opinion:  ['Figur intelektual dengan gagasan yang kuat','Populer di kalangan perkotaan dan terdidik','Perlu buktikan di level nasional'],
          liked:    ['Kemampuan komunikasi dan retorikanya','Visi pembangunan yang detail','Dekat dengan komunitas perkotaan'],
          disliked: ['Dianggap terlalu elitis oleh sebagian pemilih','Rekam jejak di Jakarta masih diperdebatkan','Perlu memperluas basis dukungan'],
          action:   ['Bangun koalisi yang lebih luas','Tunjukkan program konkret untuk semua kalangan','Perkuat jaringan ke luar Jawa']
        },
        'Puan Maharani': {
          opinion:  ['Figur dari dinasti politik yang kuat','Dukungan dari PDIP yang besar','Perlu tunjukkan kapabilitas mandiri'],
          liked:    ['Dukungan mesin partai yang solid','Pengalaman di parlemen yang panjang','Representasi perempuan dalam politik'],
          disliked: ['Terlalu identik dengan nama besar keluarga','Masih perlu perkuat citra independen','Kurang kuat di basis luar Jawa'],
          action:   ['Tunjukkan gagasan yang lebih segar','Bangun citra yang lebih merakyat','Perkuat program untuk perempuan dan pemuda']
        },
        'Agus Harimurti Yudhoyono': {
          opinion:  ['Figur muda dari keluarga militer berpengaruh','Memiliki pengalaman militer dan organisasi','Populer di kalangan Partai Demokrat'],
          liked:    ['Rekam jejak militer yang disiplin','Pendekatan yang tenang dan terukur','Dukungan keluarga SBY yang masih berpengaruh'],
          disliked: ['Masih belum teruji di pemerintahan nasional','Bayangan nama keluarga masih besar','Perlu perluas basis dukungan ke luar Demokrat'],
          action:   ['Tunjukkan kapabilitas di luar partai','Bangun program yang menyentuh rakyat bawah','Perkuat koalisi dengan partai lain']
        },
        'Bahlil Lahadalia': {
          opinion:  ['Figur pengusaha yang naik ke panggung politik','Rekam jejak di bidang investasi','Masih kontroversial di sebagian kalangan'],
          liked:    ['Kemampuan menarik investasi asing','Cara kerja yang agresif dan cepat','Jaringan bisnis yang luas'],
          disliked: ['Masih diperdebatkan soal integritas','Kurang pengalaman di bidang pemerintahan lain','Dianggap terlalu pro-kepentingan bisnis'],
          action:   ['Tunjukkan keberpihakan pada rakyat kecil','Perkuat rekam jejak di luar investasi','Bangun citra yang lebih transparan']
        }
      },
      h2_trust: {
        'Prabowo Subianto':          scaleResult(6.0, 0.14),
        'Gibran Rakabuming Raka':    scaleResult(5.2, 0.16),
        'Dedi Mulyadi':              scaleResult(6.3, 0.14),
        'Purbaya Yudhi Sadewa':      scaleResult(5.8, 0.16),
        'Sudirman Said':             scaleResult(7.1, 0.12),
        'Sherly Tjoanda':            scaleResult(5.5, 0.16),
        'Said Aqil Siradj':          scaleResult(5.6, 0.16),
        'Puan Maharani':             scaleResult(4.9, 0.17),
        'Agus Harimurti Yudhoyono':  scaleResult(5.7, 0.15),
        'Bahlil Lahadalia':          scaleResult(5.0, 0.17)
      }
    },

    surveyor_names: dist(
      ['Dio Icmi Muda','Lia Hasmita','Andi Prasetyo','Sari Wulandari','Budi Firmansyah',
       'Nita Rahayu','Rizal Fauzi','Dewi Susanti','Ahmad Yusuf','Yang lain'],
      [18,16,15,14,15,12,14,18,14,14]
    ),

    ikm: null,
    indicators: [],
    open_ended: {
      general_opinion: ['Cukup baik tapi belum optimal di sektor ekonomi','Ada kemajuan tapi belum merata'],
      expectations:    ['Fokus pada pemberantasan korupsi','Perkuat ketahanan pangan','Ciptakan lapangan kerja lebih banyak']
    },
    respondents: (function(){
      var DATA = [
        {name:'Budi Santoso',     gender:'Laki-laki', umur:'31-40', pekerjaan:'Buruh/Karyawan',   penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Selatan', c1c:'Sudirman Said',           e1d:'PKS',            a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah'},
        {name:'Siti Rahayu',      gender:'Perempuan', umur:'31-40', pekerjaan:'Ibu Rumah Tangga', penghasilan:'Rp1.000.001 – Rp3.000.000',  pendidikan:'SMA/SMK/MA/SLTA',       agama:'Islam',   suku:'Sunda',  afiliasi:'PKB',            desa_kota:'Kota',  provinsi:'Jawa Barat',            kabupaten:'Bandung',         c1c:'Anies Baswedan',          e1d:'PKB',            a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Tokoh agama'},
        {name:'Ahmad Fauzi',      gender:'Laki-laki', umur:'41-50', pekerjaan:'PNS',              penghasilan:'Rp5.000.001 – Rp10.000.000', pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Gerindra',       desa_kota:'Kota',  provinsi:'Jawa Tengah',           kabupaten:'Semarang',        c1c:'Prabowo Subianto',        e1d:'Partai Gerindra',a2f:'Kurang perlu', f5b:'7', a1b:'7', a2g:'Menteri'},
        {name:'Dewi Kurniawati',  gender:'Perempuan', umur:'31-40', pekerjaan:'Buruh/Karyawan',   penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Jawa Timur',            kabupaten:'Surabaya',        c1c:'Sudirman Said',           e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'5', a1b:'5', a2g:'Kepala daerah'},
        {name:'Eko Prasetyo',     gender:'Laki-laki', umur:'17-30', pekerjaan:'Mahasiswa',        penghasilan:'≤ Rp1.000.000',              pendidikan:'SMA/SMK/MA/SLTA',       agama:'Islam',   suku:'Jawa',   afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Timur',   c1c:'Dedi Mulyadi',            e1d:'PDI Perjuangan', a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Politisi'},
        {name:'Fitriani',         gender:'Perempuan', umur:'31-40', pekerjaan:'Wiraswasta',       penghasilan:'Rp5.000.001 – Rp10.000.000', pendidikan:'Diploma I/II/III/IV',   agama:'Islam',   suku:'Minang', afiliasi:'PKS',            desa_kota:'Kota',  provinsi:'Sumatera Barat',        kabupaten:'Padang',          c1c:'Anies Baswedan',          e1d:'PKS',            a2f:'Perlu',        f5b:'5', a1b:'6', a2g:'Akademisi'},
        {name:'Gunawan',          gender:'Laki-laki', umur:'41-50', pekerjaan:'Wiraswasta',       penghasilan:'Rp5.000.001 – Rp10.000.000', pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Golkar',         desa_kota:'Kota',  provinsi:'Jawa Tengah',           kabupaten:'Solo',            c1c:'Prabowo Subianto',        e1d:'Partai Golkar',  a2f:'Tidak perlu',  f5b:'7', a1b:'7', a2g:'Politisi'},
        {name:'Haryanti',         gender:'Perempuan', umur:'31-40', pekerjaan:'PNS',              penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Protestan',suku:'Batak', afiliasi:'Nasdem',         desa_kota:'Kota',  provinsi:'Sumatera Utara',        kabupaten:'Medan',           c1c:'Gibran Rakabuming Raka',  e1d:'Partai NasDem',  a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah'},
        {name:'Irfan Hakim',      gender:'Laki-laki', umur:'31-40', pekerjaan:'Buruh/Karyawan',   penghasilan:'Rp5.000.001 – Rp10.000.000', pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Sunda',  afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Jawa Barat',            kabupaten:'Depok',           c1c:'Sudirman Said',           e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'6', a1b:'5', a2g:'Kepala daerah'},
        {name:'Junita Sari',      gender:'Perempuan', umur:'17-30', pekerjaan:'Pelajar',          penghasilan:'≤ Rp1.000.000',              pendidikan:'SMA/SMK/MA/SLTA',       agama:'Islam',   suku:'Betawi', afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Riau',                  kabupaten:'Pekanbaru',       c1c:'Anies Baswedan',          e1d:'PKS',            a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Akademisi'},
        {name:'Kurniawan',        gender:'Laki-laki', umur:'41-50', pekerjaan:'Petani',           penghasilan:'Rp1.000.001 – Rp3.000.000',  pendidikan:'SMP/MTs/SLTP',          agama:'Islam',   suku:'Jawa',   afiliasi:'PDIP',           desa_kota:'Desa',   provinsi:'Jawa Tengah',           kabupaten:'Purwokerto',      c1c:'Dedi Mulyadi',            e1d:'PDI Perjuangan', a2f:'Tidak tahu',   f5b:'5', a1b:'5', a2g:'Tokoh agama'},
        {name:'Lestari',          gender:'Perempuan', umur:'41-50', pekerjaan:'Ibu Rumah Tangga', penghasilan:'Rp1.000.001 – Rp3.000.000',  pendidikan:'SD',                    agama:'Islam',   suku:'Jawa',   afiliasi:'PKB',            desa_kota:'Desa',   provinsi:'Jawa Timur',            kabupaten:'Malang',          c1c:'Prabowo Subianto',        e1d:'PKB',            a2f:'Tidak tahu',   f5b:'6', a1b:'6', a2g:'Tokoh agama'},
        {name:'Muhamad Rizky',    gender:'Laki-laki', umur:'17-30', pekerjaan:'Mahasiswa',        penghasilan:'≤ Rp1.000.000',              pendidikan:'SMA/SMK/MA/SLTA',       agama:'Islam',   suku:'Sunda',  afiliasi:'PKS',            desa_kota:'Kota',  provinsi:'Jawa Barat',            kabupaten:'Bogor',           c1c:'Anies Baswedan',          e1d:'PKS',            a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Akademisi'},
        {name:'Nurul Hidayah',    gender:'Perempuan', umur:'31-40', pekerjaan:'PNS',              penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Yang lain', afiliasi:'Golkar',      desa_kota:'Kota',  provinsi:'Sulawesi Selatan',      kabupaten:'Makassar',        c1c:'Sudirman Said',           e1d:'Partai Golkar',  a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah'},
        {name:'Oki Setiana',      gender:'Laki-laki', umur:'31-40', pekerjaan:'Buruh/Karyawan',   penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Diploma I/II/III/IV',   agama:'Katolik', suku:'Yang lain', afiliasi:'Tidak Ada',   desa_kota:'Kota',  provinsi:'Nusa Tenggara Timur',   kabupaten:'Kupang',          c1c:'Purbaya Yudhi Sadewa',    e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'7', a1b:'7', a2g:'Akademisi'},
        {name:'Putri Andini',     gender:'Perempuan', umur:'31-40', pekerjaan:'Wiraswasta',       penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Utara',   c1c:'Sudirman Said',           e1d:'Partai NasDem',  a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Kepala daerah'},
        {name:'Qori Fadillah',    gender:'Perempuan', umur:'17-30', pekerjaan:'Mahasiswa',        penghasilan:'≤ Rp1.000.000',              pendidikan:'SMA/SMK/MA/SLTA',       agama:'Islam',   suku:'Minang', afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Daerah Istimewa Yogyakarta', kabupaten:'Yogyakarta', c1c:'Anies Baswedan',         e1d:'PKS',            a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Akademisi'},
        {name:'Rudi Hartono',     gender:'Laki-laki', umur:'41-50', pekerjaan:'Buruh/Karyawan',   penghasilan:'Rp5.000.001 – Rp10.000.000', pendidikan:'Strata I/II/III',       agama:'Islam',   suku:'Jawa',   afiliasi:'Tidak Ada',      desa_kota:'Kota',  provinsi:'Jawa Timur',            kabupaten:'Surabaya',        c1c:'Sudirman Said',           e1d:'PAN',            a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah'},
        {name:'Sinta Dewi',       gender:'Perempuan', umur:'31-40', pekerjaan:'PNS',              penghasilan:'Rp3.000.001 – Rp5.000.000',  pendidikan:'Strata I/II/III',       agama:'Hindu',   suku:'Yang lain', afiliasi:'Tidak Ada',   desa_kota:'Kota',  provinsi:'Bali',                  kabupaten:'Denpasar',        c1c:'Agus Harimurti Yudhoyono',e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Politisi'},
        {name:'Taufik Rahman',    gender:'Laki-laki', umur:'41-50', pekerjaan:'Petani',           penghasilan:'Rp1.000.001 – Rp3.000.000',  pendidikan:'SD',                    agama:'Islam',   suku:'Yang lain', afiliasi:'Tidak Ada',   desa_kota:'Desa',   provinsi:'Kalimantan Selatan',    kabupaten:'Banjarmasin',     c1c:'Dedi Mulyadi',            e1d:'PKB',            a2f:'Tidak tahu',   f5b:'5', a1b:'5', a2g:'Tokoh agama'}
      ];
      return DATA.map(function(d,i){
        return {
          id: 'R'+(i+1),
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          name:       d.name,
          gender:     d.gender,
          umur:       d.umur,
          pekerjaan:  d.pekerjaan,
          penghasilan:d.penghasilan,
          pendidikan: d.pendidikan,
          agama:      d.agama,
          suku:       d.suku,
          afiliasi_politik: d.afiliasi,
          desa_kota:  d.desa_kota,
          provinsi:   d.provinsi,
          kabupaten_kota: d.kabupaten,
          location:   d.kabupaten,
          surveyor:   'Dio Icmi Muda',
          answers: {
            a1a: 'Kepemimpinan nasional perlu lebih tegas dan transparan',
            a1b_score: d.a1b,
            a2f_new_leader: d.a2f,
            a2g_background: d.a2g,
            b1a_vote_reason: d.c1c + ', karena rekam jejaknya bersih dan berorientasi rakyat',
            c1c_vote:  d.c1c,
            d1a_sim10: d.c1c,
            e1d_party: d.e1d,
            f5a_overall: 'Kinerja cukup baik namun masih perlu peningkatan di bidang ekonomi',
            f5b_score:   d.f5b,
            g1a_reason: 'Memilih berdasarkan rekam jejak dan visi yang jelas',
            g1b_factor: 'Ajakan keluarga'
          }
        };
      });
    })()
  };
}
