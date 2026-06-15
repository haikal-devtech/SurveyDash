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
  afiliasi_politik:       'Afiliasi Politik (Partai)',
  tempat_tinggal:         'Tempat Tinggal :       ',
  alamat:                 'Alamat  ',
  kabupaten_kota:         'Kabupaten/Kota',
  provinsi_responden:     'Provinsi',
  no_hp:                  'No HP',
  no_rekening:            'No Rekening/e wallet Responden (souvenir)',

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
  f1b: 'F1b. Apa yang paling tidak Anda sukai dari kinerja Pemerintah Prabowo?',
  f1c: 'F1c. Apa sebaiknya yang harus dilakukan oleh Pemerintah Prabowo?',
  f5a: 'F5a. Secara keseluruhan, bagaimana penilaian Anda terhadap kinerja Pemerintahan Prabowo?',
  f5b: 'F5b. Dari skala 1-10, berapa skor yang Anda berikan untuk kinerja Pemerintahan Prabowo?',
  f5c: 'F5c. Menurut Anda, satu isu atau masalah apa yang paling mendesak perlu segera ditangani Pemerintahan Prabowo?',

  // BAGIAN F2 — grid title prefix
  f2_grid: 'Bagaimana kinerja pemerintah di bidang berikut?',
  f3_grid: 'Pertanyaan F3a-F3e',
  f4_grid: 'Pertanyaan F4a-F4c',

  // BAGIAN G
  g1a: 'G1a. Apa pertimbangan Anda dalam memilih pada Pemilu 2029?',
  g1b: 'G1b. Apa pertimbangan utama Anda dalam memilih kandidat di Pemilu 2029? (semi terbuka)',
  g2_grid: 'Pertanyaan G2a-G2g',
  g3_grid: 'Pertanyaan G3a-G3d',
  g4_grid: 'Pertanyaan G4a-G4l',

  // BAGIAN H2 — grid title
  h2_grid: 'Pertanyaan H2a-H2e',

  // BAGIAN I — surveyor
  i1a: 'I1a. Menurut penilaian Anda, sampai sejauh manakah responden memahami dengan baik pertanyaan-pertanyaan yang diberikan?',
  i1b: 'I1b. Mengingat kondisi wawancara, konsistensi jawaban, dan upaya yang telah dilakukan responden ini untuk menjawab pertanyaan-pertanyaan dengan sejujur-jujurnya, seberapa terpercayakah menurut Anda jawaban-jawaban dari responden?',
  nama_surveyor:    'Nama Surveyor',
  provinsi_surveyor: 'Provinsi' // second occurrence (surveyor province)
};

// ============================================================
// F2: Row labels in the matrix
// ============================================================
var F2_ROWS = {
  'F2a. Pelayanan Publik':                                          'Pelayanan Publik',
  'F2b. Ekonomi, Industri, Teknologi, dan Lapangan Pekerjaan?':    'Ekonomi & Lapangan Kerja',
  'F2c. Pembangunan, Infrastruktur, dan Transportasi?':             'Infrastruktur & Transportasi',
  'F2d. Penanganan Tanggap Bencana dan Darurat Kebencanaan?':       'Tanggap Bencana',
  'F2e. Pendidikan dan Pengembangan SDM':                           'Pendidikan & SDM',
  'F2f. Lingkungan dan Pengelolaan Hutan':                          'Lingkungan & Hutan',
  'F2g. Pertahanan, Keamanan, dan HAM':                             'Pertahanan, Keamanan & HAM',
  'F2h. Pertanian dan Ketahanan Pangan':                            'Pertanian & Pangan',
  'F2i. Demokrasi, Politik Dalam dan Luar Negeri':                  'Demokrasi & Politik',
  'F2j. Pajak dan Keuangan':                                        'Pajak & Keuangan'
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

var G4_ROWS = {
  'G4a. Ajakan perkumpulan profesi (Petani, pedagang, organda, dll.)': 'Perkumpulan profesi',
  'G4b. Tokoh agama (Kyai/ulama, imam, pendeta, dsb.)':               'Tokoh agama',
  'G4c. Pejabat-pejabat negara setempat (misalnya, kepala desa, lurah, camat)': 'Pejabat setempat',
  'G4d. Pengurus partai politik':                                      'Pengurus parpol',
  'G4e. Komunitas berbasis etnis':                                     'Komunitas etnis',
  'G4f. Tokoh adat':                                                   'Tokoh adat',
  'G4g. Pemilik tanah/bos/majikan':                                    'Pemilik tanah/bos',
  'G4h. LSM lokal':                                                    'LSM lokal',
  'G4i. Teman':                                                        'Teman',
  'G4j. Keluarga':                                                     'Keluarga',
  'G4k. Tetangga':                                                     'Tetangga',
  'G4l. Lainnya':                                                      'Lainnya'
};

// H1: leaders surveyed
var H1_LEADERS = ['Prabowo Subianto', 'Gibran Rakabuming Raka', 'Sudirman Said'];

// H2: leaders in trust grid (exactly as in form)
var H2_ROWS = {
  'Prabowo Subianto':     'Prabowo Subianto',
  'Gibran Rakabumi Raka': 'Gibran Rakabuming Raka',
  'Dedi Mulyadi':         'Dedi Mulyadi',
  'Purbaya Yudhi Sadewa': 'Purbaya Yudhi Sadewa',
  'Sudirman Said':        'Sudirman Said'
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

  // Find ALL columns whose header starts with a prefix (for duplicate H1 questions)
  function allColsStarting(prefix) {
    var p = prefix.trim().toLowerCase().substring(0, 50);
    var found = [];
    headers.forEach(function(h, i) {
      if (h.trim().toLowerCase().startsWith(p)) found.push(i);
    });
    return found;
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
  var f2GridPrefix = COLUMN_MAP['f2_grid'];
  var f3GridPrefix = COLUMN_MAP['f3_grid'];
  var f4GridPrefix = COLUMN_MAP['f4_grid'];

  var f2 = {};
  Object.keys(F2_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(f2GridPrefix, rowLabel);
    f2[F2_ROWS[rowLabel]] = countLabelScale(cIdx, KEPUASAN_4);
  });

  var f3 = {};
  Object.keys(F3_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(f3GridPrefix, rowLabel);
    f3[F3_ROWS[rowLabel]] = countScale(cIdx, 1, 10);
  });

  var f4 = {};
  Object.keys(F4_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(f4GridPrefix, rowLabel);
    f4[F4_ROWS[rowLabel]] = countScale(cIdx, 1, 10);
  });

  var gov_performance = {
    f2_satisfaction: f2,
    f3_leadership:   f3,
    f4_trust:        f4,
    f5b_score:       countScale(col('f5b'), 1, 10),
    open: {
      f1a: openText(col('f1a')),
      f1b: openText(col('f1b')),
      f1c: openText(col('f1c')),
      f5a: openText(col('f5a')),
      f5c: openText(col('f5c'))
    }
  };

  // BAGIAN G — VOTER BEHAVIOR
  var g2GridPrefix = COLUMN_MAP['g2_grid'];
  var g3GridPrefix = COLUMN_MAP['g3_grid'];
  var g4GridPrefix = COLUMN_MAP['g4_grid'];

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

  var g4 = {};
  Object.keys(G4_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(g4GridPrefix, rowLabel);
    g4[G4_ROWS[rowLabel]] = countLabelScale(cIdx, PERTIMB_6);
  });

  var voter_behavior = {
    g1b:         countMulti(col('g1b')),
    g2_campaign: g2,
    g3_factors:  g3,
    g4_influence:g4,
    open_g1a:    openText(col('g1a'))
  };

  // BAGIAN H — PUBLIC EMOTION
  // H1: duplicate question titles — find by occurrence order
  var H1_PREFIXES = {
    opinion: 'H1a. Bagaimana pendapat Anda tentang sosok pemimpin berikut?',
    liked:   'H1b. Apa yang paling Anda sukai dari sosok pemimpin berikut?',
    disliked:'H1c. Apa yang paling Anda tidak sukai dari sosok pemimpin berikut?',
    action:  'H1d. Apa yang harus dilakukan oleh sosok pemimpin berikut?'
  };

  var h1 = {};
  H1_LEADERS.forEach(function(leader) {
    h1[leader] = { opinion: [], liked: [], disliked: [], action: [] };
  });

  Object.keys(H1_PREFIXES).forEach(function(field) {
    var prefix = H1_PREFIXES[field];
    var matchingCols = allColsStarting(prefix);

    // If not enough found, try shorter prefix (e.g. "H1a.")
    if (matchingCols.length < H1_LEADERS.length) {
      var shortPrefix = prefix.split('.')[0] + '.';
      var extra = allColsStarting(shortPrefix);
      extra.forEach(function(idx) {
        if (matchingCols.indexOf(idx) === -1) matchingCols.push(idx);
      });
    }

    matchingCols.slice(0, H1_LEADERS.length).forEach(function(cIdx, i) {
      var leader = H1_LEADERS[i];
      if (leader) h1[leader][field] = openText(cIdx, 300);
    });
  });

  // H2: trust scores grid
  var h2GridPrefix = COLUMN_MAP['h2_grid'];
  var h2 = {};
  Object.keys(H2_ROWS).forEach(function(rowLabel) {
    var cIdx = gridCols(h2GridPrefix, rowLabel);
    h2[H2_ROWS[rowLabel]] = countScale(cIdx, 0, 10);
  });

  var public_emotion = { h1: h1, h2_trust: h2 };

  // BAGIAN I — SURVEYOR QUALITY
  var surveyor_quality = {
    i1a_understanding: countSingle(col('i1a')),
    i1b_reliability:   countSingle(col('i1b'))
  };

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
      surveyor_understanding: getCellVal(r, col('i1a')),
      surveyor_reliability:   getCellVal(r, col('i1b')),
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
    surveyor_quality:   surveyor_quality,

    // Backward compat dengan SurveyData lama (biar ga error di frontend)
    ikm:        null,
    indicators: [],
    open_ended: {
      general_opinion: gov_performance.open.f1a.slice(0, 100),
      expectations:    gov_performance.open.f1c.slice(0, 100)
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

  // Helper: label scale (4-option)
  function labelScale4(dist_obj) {
    var total = Object.keys(dist_obj).reduce(function(a,k){return a+dist_obj[k];},0);
    var scoreMap = { 'Sangat tidak puas':1,'Tidak puas':2,'Puas':3,'Sangat puas':4 };
    var sum = 0;
    Object.keys(scoreMap).forEach(function(k){ sum += (dist_obj[k]||0) * scoreMap[k]; });
    return { avg: Math.round(sum/total*100)/100, dist: dist_obj };
  }

  // Nama persis dari form C1a/C1b/C1c
  var CAPRES_FULL = [
    'Prabowo Subianto','Gibran Rakabuming Raka','Agus Harimurti Yudhoyono',
    'Pramono Anung','Purbaya Yudhi Sadewa','Anies Baswedan','Dedi Mulyadi',
    'Bahlil Lahadalia','Khofifah Indar Parawansa','Abdul Muhaimin Iskandar',
    'Anis Matta','Erick Thohir','Muhamad Chatib Basri','Mahfud MD',
    'Puan Maharani','Sherly Tjoanda','Surya Paloh','Muhamad Mardiono',
    'Anas Urbaningrum','Yusril Ihza Mahendra','Zulkifli Hasan',
    'Muhammad Sohibul Iman','Sudirman Said','Andika Perkasa','Lainnya ......'
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
      umur:             dist(['17-25','26-35','36-45','46-55','56+'], [18,28,25,18,11]),
      pekerjaan:        dist(['Swasta','Wiraswasta','PNS/ASN','Mahasiswa/Pelajar','Ibu Rumah Tangga','Lainnya'], [32,22,18,12,10,6]),
      pendidikan:       dist(['SD','SMP','SMA/SMK','D3/D4','S1','S2/S3'], [5,10,38,12,28,7]),
      agama:            dist(['Islam','Kristen Protestan','Katolik','Hindu','Buddha','Lainnya'], [84,8,4,2,1,1]),
      penghasilan:      dist(['< 1 juta','1-3 juta','3-5 juta','5-10 juta','> 10 juta'], [12,28,30,22,8]),
      suku:             dist(['Jawa','Sunda','Batak','Melayu','Bugis','Lainnya'], [35,18,12,10,8,17]),
      afiliasi_politik: dist(['PKS','Gerindra','PDIP','Golkar','PKB','Nasdem','Tidak Berafiliasi','Lainnya'], [14,10,12,9,8,6,32,9]),
      desa_kota:        dist(['Perkotaan','Pinggiran Kota','Pedesaan'], [48,32,20]),
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
        var aw = [148,145,138,115,98,140,132,95,105,90,70,125,80,118,108,62,85,55,72,98,88,72,102,88,0];
        var out = {};
        CAPRES_FULL.forEach(function(c,i){ out[c] = aw[i] || 0; });
        return out;
      })(),
      likability: dist(CAPRES_FULL,
        [22,18,16,12,14,24,19,8,11,7,4,10,5,8,7,4,3,2,3,4,4,4,20,7,5]),
      vote_intention: dist(CAPRES_FULL,
        [22,18,16,12,14,24,19,8,11,7,4,10,5,8,7,4,3,2,3,4,4,4,20,7,5]),
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
      f2_satisfaction: {
        'Pelayanan Publik':           labelScale4({'Sangat tidak puas':8,'Tidak puas':28,'Puas':88,'Sangat puas':26}),
        'Ekonomi & Lapangan Kerja':   labelScale4({'Sangat tidak puas':18,'Tidak puas':42,'Puas':70,'Sangat puas':20}),
        'Infrastruktur & Transportasi':labelScale4({'Sangat tidak puas':10,'Tidak puas':25,'Puas':82,'Sangat puas':33}),
        'Tanggap Bencana':            labelScale4({'Sangat tidak puas':12,'Tidak puas':30,'Puas':78,'Sangat puas':30}),
        'Pendidikan & SDM':           labelScale4({'Sangat tidak puas':15,'Tidak puas':35,'Puas':75,'Sangat puas':25}),
        'Lingkungan & Hutan':         labelScale4({'Sangat tidak puas':20,'Tidak puas':40,'Puas':68,'Sangat puas':22}),
        'Pertahanan, Keamanan & HAM': labelScale4({'Sangat tidak puas':10,'Tidak puas':28,'Puas':82,'Sangat puas':30}),
        'Pertanian & Pangan':         labelScale4({'Sangat tidak puas':16,'Tidak puas':38,'Puas':72,'Sangat puas':24}),
        'Demokrasi & Politik':        labelScale4({'Sangat tidak puas':22,'Tidak puas':45,'Puas':62,'Sangat puas':21}),
        'Pajak & Keuangan':           labelScale4({'Sangat tidak puas':25,'Tidak puas':48,'Puas':58,'Sangat puas':19})
      },
      f3_leadership: {
        'Kejelasan visi & arah kebijakan':    scaleResult(6.1, 0.16),
        'Kecepatan respons masalah/krisis':   scaleResult(5.7, 0.17),
        'Ketegasan pengambilan keputusan':    scaleResult(6.4, 0.15),
        'Konsistensi pernyataan vs kebijakan':scaleResult(5.5, 0.18),
        'Kemampuan koordinasi kebijakan':     scaleResult(5.9, 0.16)
      },
      f4_trust: {
        'Kepercayaan terhadap pemerintah': scaleResult(5.8, 0.16),
        'Integritas & kejujuran pemerintah':scaleResult(5.4, 0.18),
        'Pemerintah bekerja untuk rakyat': scaleResult(5.6, 0.17)
      },
      f5b_score: scaleResult(5.9, 0.15),
      open: {
        f1a: ['Cukup baik tapi belum optimal di sektor ekonomi','Ada kemajuan tapi belum merata','Infrastruktur meningkat, tapi daya beli masyarakat turun'],
        f1b: ['Kenaikan harga kebutuhan pokok','Lapangan kerja masih kurang','Korupsi masih terjadi di berbagai level'],
        f1c: ['Fokus pada pemberantasan korupsi','Perkuat ketahanan pangan','Ciptakan lapangan kerja lebih banyak'],
        f5a: ['Kinerjanya 6 dari 10, masih perlu banyak perbaikan','Sudah ada usaha tapi hasil belum dirasakan rakyat kecil','Perlu lebih konsisten antara ucapan dan kebijakan'],
        f5c: ['Harga kebutuhan pokok yang terus naik','Pengangguran dan sulitnya mencari pekerjaan','Korupsi yang belum tuntas diberantas']
      }
    },

    voter_behavior: {
      g1b: dist(
        ['Ajakan keluarga','Rekomendasi tokoh/ulama/dll.','Pemberian uang/barang/jasa','Lainnya'],
        [55,38,18,12]
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
      g4_influence: {
        'Keluarga':          { avg: 3.8, dist: {'Sama sekali tidak jadi pertimbangan':5,'Agak jadi pertimbangan':15,'Dipertimbangkan':38,'Sangat dipertimbangkan':52,'Luar biasa dipertimbangkan':35,'Tidak tahu':5} },
        'Tokoh agama':       { avg: 3.2, dist: {'Sama sekali tidak jadi pertimbangan':15,'Agak jadi pertimbangan':25,'Dipertimbangkan':42,'Sangat dipertimbangkan':40,'Luar biasa dipertimbangkan':22,'Tidak tahu':6} },
        'Teman':             { avg: 3.0, dist: {'Sama sekali tidak jadi pertimbangan':18,'Agak jadi pertimbangan':30,'Dipertimbangkan':45,'Sangat dipertimbangkan':35,'Luar biasa dipertimbangkan':17,'Tidak tahu':5} },
        'Tetangga':          { avg: 2.5, dist: {'Sama sekali tidak jadi pertimbangan':30,'Agak jadi pertimbangan':40,'Dipertimbangkan':42,'Sangat dipertimbangkan':25,'Luar biasa dipertimbangkan':8,'Tidak tahu':5} },
        'Pejabat setempat':  { avg: 2.1, dist: {'Sama sekali tidak jadi pertimbangan':45,'Agak jadi pertimbangan':38,'Dipertimbangkan':30,'Sangat dipertimbangkan':22,'Luar biasa dipertimbangkan':10,'Tidak tahu':5} },
        'Pengurus parpol':   { avg: 2.0, dist: {'Sama sekali tidak jadi pertimbangan':50,'Agak jadi pertimbangan':40,'Dipertimbangkan':28,'Sangat dipertimbangkan':18,'Luar biasa dipertimbangkan':9,'Tidak tahu':5} },
        'Perkumpulan profesi':{ avg: 2.3, dist: {'Sama sekali tidak jadi pertimbangan':38,'Agak jadi pertimbangan':40,'Dipertimbangkan':35,'Sangat dipertimbangkan':22,'Luar biasa dipertimbangkan':10,'Tidak tahu':5} },
        'Komunitas etnis':   { avg: 2.2, dist: {'Sama sekali tidak jadi pertimbangan':40,'Agak jadi pertimbangan':38,'Dipertimbangkan':32,'Sangat dipertimbangkan':22,'Luar biasa dipertimbangkan':13,'Tidak tahu':5} },
        'Tokoh adat':        { avg: 2.4, dist: {'Sama sekali tidak jadi pertimbangan':35,'Agak jadi pertimbangan':38,'Dipertimbangkan':35,'Sangat dipertimbangkan':25,'Luar biasa dipertimbangkan':12,'Tidak tahu':5} },
        'Pemilik tanah/bos': { avg: 1.8, dist: {'Sama sekali tidak jadi pertimbangan':58,'Agak jadi pertimbangan':40,'Dipertimbangkan':25,'Sangat dipertimbangkan':15,'Luar biasa dipertimbangkan':7,'Tidak tahu':5} },
        'LSM lokal':         { avg: 1.9, dist: {'Sama sekali tidak jadi pertimbangan':55,'Agak jadi pertimbangan':38,'Dipertimbangkan':28,'Sangat dipertimbangkan':18,'Luar biasa dipertimbangkan':6,'Tidak tahu':5} },
        'Lainnya':           { avg: 2.0, dist: {'Sama sekali tidak jadi pertimbangan':50,'Agak jadi pertimbangan':35,'Dipertimbangkan':30,'Sangat dipertimbangkan':20,'Luar biasa dipertimbangkan':10,'Tidak tahu':5} }
      },
      open_g1a: ['Rekam jejak yang bersih dan terbukti','Program yang pro rakyat kecil','Tidak ada hubungan dengan oligarki']
    },

    public_emotion: {
      h1: {
        'Prabowo Subianto': {
          opinion:  ['Pemimpin yang tegas dan berpengalaman','Sudah terbukti dalam bidang pertahanan','Perlu lebih perhatian ke ekonomi rakyat kecil'],
          liked:    ['Ketegasannya','Pengalamannya di militer','Komitmen terhadap kedaulatan negara'],
          disliked: ['Kurang merakyat di beberapa aspek','Gaya komunikasi yang terkadang keras','Kurang transparan soal ekonomi'],
          action:   ['Lebih fokus ke kesejahteraan rakyat','Perkuat pemberantasan korupsi','Pertahankan stabilitas keamanan']
        },
        'Gibran Rakabuming Raka': {
          opinion:  ['Masih terlalu muda dan perlu banyak pengalaman','Diuntungkan dari nama keluarga','Perlu buktikan diri lebih banyak'],
          liked:    ['Semangat dan energi anak muda','Program digitalisasi yang menarik','Inovatif dalam beberapa kebijakan'],
          disliked: ['Kurang pengalaman di level nasional','Terlalu bergantung pada warisan politik keluarga','Masih perlu belajar banyak'],
          action:   ['Perbanyak program pro rakyat','Tunjukkan kemandirian dari orang tua','Fokus pada kebijakan yang terukur']
        },
        'Sudirman Said': {
          opinion:  ['Figur yang jujur dan berintegritas','Rekam jejaknya sangat baik','Berani bersuara walau berisiko'],
          liked:    ['Integritasnya yang tidak tergoyahkan','Keberanian menghadapi kepentingan oligarki','Rekam jejak bersih sepanjang karir'],
          disliked: ['Kurang dikenal di lapisan masyarakat bawah','Perlu strategi komunikasi yang lebih masif','Belum punya mesin politik yang kuat'],
          action:   ['Perkuat jaringan ke daerah','Tingkatkan visibilitas di media','Bangun koalisi dengan tokoh reformis lain']
        }
      },
      h2_trust: {
        'Prabowo Subianto':     scaleResult(6.0, 0.14),
        'Gibran Rakabuming Raka':scaleResult(5.2, 0.16),
        'Dedi Mulyadi':         scaleResult(6.3, 0.14),
        'Purbaya Yudhi Sadewa': scaleResult(5.8, 0.16),
        'Sudirman Said':        scaleResult(7.1, 0.12)
      }
    },

    surveyor_quality: {
      i1a_understanding: dist([
        '1.  Kesulitan dalam memahami pertanyaan-pertanyaan ini',
        '2. Beberapa kesalahpahaman atas pertanyaan-pertanyaan mungkin telah terjadi',
        '3. Hanya terdapat sesekali kebingungan',
        '4. Ia mengerti dengan sempurna semua pertanyaan'
      ], [5,22,55,68]),
      i1b_reliability: dist([
        '1. Tidak terpercaya',
        '2. Meragukan',
        '3. Agak terpercaya',
        '4. Terpercaya',
        '5. Sangat terpercaya'
      ], [3,8,25,72,42])
    },

    ikm: null,
    indicators: [],
    open_ended: {
      general_opinion: ['Cukup baik tapi belum optimal di sektor ekonomi','Ada kemajuan tapi belum merata'],
      expectations:    ['Fokus pada pemberantasan korupsi','Perkuat ketahanan pangan','Ciptakan lapangan kerja lebih banyak']
    },
    respondents: (function(){
      var DATA = [
        {name:'Budi Santoso',     gender:'Laki-laki', umur:'36-45', pekerjaan:'Swasta',           penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Islam',          suku:'Jawa',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Selatan', c1c:'Sudirman Said',          e1d:'PKS',            a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah', i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Siti Rahayu',      gender:'Perempuan', umur:'26-35', pekerjaan:'Ibu Rumah Tangga', penghasilan:'1-3 juta',   pendidikan:'SMA/SMK', agama:'Islam',          suku:'Sunda',   afiliasi:'PKB',               desa_kota:'Perkotaan',      provinsi:'Jawa Barat',            kabupaten:'Bandung',         c1c:'Anies Baswedan',         e1d:'PKB',            a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Tokoh agama',   i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'4. Terpercaya'},
        {name:'Ahmad Fauzi',      gender:'Laki-laki', umur:'46-55', pekerjaan:'PNS/ASN',          penghasilan:'5-10 juta',  pendidikan:'S2/S3',   agama:'Islam',          suku:'Jawa',    afiliasi:'Partai Gerindra',   desa_kota:'Perkotaan',      provinsi:'Jawa Tengah',           kabupaten:'Semarang',        c1c:'Prabowo Subianto',       e1d:'Partai Gerindra',a2f:'Kurang perlu', f5b:'7', a1b:'7', a2g:'Menteri',       i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'5. Sangat terpercaya'},
        {name:'Dewi Kurniawati',  gender:'Perempuan', umur:'26-35', pekerjaan:'Swasta',           penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Islam',          suku:'Jawa',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Jawa Timur',            kabupaten:'Surabaya',        c1c:'Sudirman Said',          e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'5', a1b:'5', a2g:'Kepala daerah', i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'4. Terpercaya'},
        {name:'Eko Prasetyo',     gender:'Laki-laki', umur:'17-25', pekerjaan:'Mahasiswa/Pelajar',penghasilan:'< 1 juta',   pendidikan:'SMA/SMK', agama:'Islam',          suku:'Jawa',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Timur',   c1c:'Dedi Mulyadi',           e1d:'PDI Perjuangan', a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Politisi',      i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'3. Agak terpercaya'},
        {name:'Fitriani',         gender:'Perempuan', umur:'36-45', pekerjaan:'Wiraswasta',       penghasilan:'5-10 juta',  pendidikan:'D3/D4',   agama:'Islam',          suku:'Minang',  afiliasi:'PKS',               desa_kota:'Perkotaan',      provinsi:'Sumatera Barat',        kabupaten:'Padang',          c1c:'Anies Baswedan',         e1d:'PKS',            a2f:'Perlu',        f5b:'5', a1b:'6', a2g:'Akademisi',     i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Gunawan',          gender:'Laki-laki', umur:'46-55', pekerjaan:'Wiraswasta',       penghasilan:'5-10 juta',  pendidikan:'S1',      agama:'Islam',          suku:'Jawa',    afiliasi:'Partai Golkar',     desa_kota:'Perkotaan',      provinsi:'Jawa Tengah',           kabupaten:'Solo',            c1c:'Prabowo Subianto',       e1d:'Partai Golkar',  a2f:'Tidak perlu',  f5b:'7', a1b:'7', a2g:'Politisi',      i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'5. Sangat terpercaya'},
        {name:'Haryanti',         gender:'Perempuan', umur:'26-35', pekerjaan:'PNS/ASN',          penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Kristen Protestan',suku:'Batak', afiliasi:'Partai NasDem',    desa_kota:'Perkotaan',      provinsi:'Sumatera Utara',        kabupaten:'Medan',           c1c:'Gibran Rakabuming Raka', e1d:'Partai NasDem',  a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah', i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'4. Terpercaya'},
        {name:'Irfan Hakim',      gender:'Laki-laki', umur:'36-45', pekerjaan:'Swasta',           penghasilan:'5-10 juta',  pendidikan:'S1',      agama:'Islam',          suku:'Sunda',   afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Jawa Barat',            kabupaten:'Depok',           c1c:'Sudirman Said',          e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'6', a1b:'5', a2g:'Kepala daerah', i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Junita Sari',      gender:'Perempuan', umur:'17-25', pekerjaan:'Mahasiswa/Pelajar',penghasilan:'< 1 juta',   pendidikan:'SMA/SMK', agama:'Islam',          suku:'Melayu',  afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Riau',                  kabupaten:'Pekanbaru',       c1c:'Anies Baswedan',         e1d:'PKS',            a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Akademisi',     i1a:'2. Beberapa kesalahpahaman atas pertanyaan-pertanyaan mungkin telah terjadi','i1b':'3. Agak terpercaya'},
        {name:'Kurniawan',        gender:'Laki-laki', umur:'56+',   pekerjaan:'Petani/Buruh',     penghasilan:'1-3 juta',   pendidikan:'SMP',     agama:'Islam',          suku:'Jawa',    afiliasi:'PDI Perjuangan',    desa_kota:'Pedesaan',       provinsi:'Jawa Tengah',           kabupaten:'Purwokerto',      c1c:'Dedi Mulyadi',           e1d:'PDI Perjuangan', a2f:'Tidak tahu',   f5b:'5', a1b:'5', a2g:'Tokoh agama',   i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'4. Terpercaya'},
        {name:'Lestari',          gender:'Perempuan', umur:'46-55', pekerjaan:'Ibu Rumah Tangga', penghasilan:'1-3 juta',   pendidikan:'SD',      agama:'Islam',          suku:'Jawa',    afiliasi:'PKB',               desa_kota:'Pedesaan',       provinsi:'Jawa Timur',            kabupaten:'Malang',          c1c:'Prabowo Subianto',       e1d:'PKB',            a2f:'Tidak tahu',   f5b:'6', a1b:'6', a2g:'Tokoh agama',   i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'3. Agak terpercaya'},
        {name:'Muhamad Rizky',    gender:'Laki-laki', umur:'17-25', pekerjaan:'Mahasiswa/Pelajar',penghasilan:'< 1 juta',   pendidikan:'SMA/SMK', agama:'Islam',          suku:'Sunda',   afiliasi:'PKS',               desa_kota:'Perkotaan',      provinsi:'Jawa Barat',            kabupaten:'Bogor',           c1c:'Anies Baswedan',         e1d:'PKS',            a2f:'Sangat perlu', f5b:'4', a1b:'4', a2g:'Akademisi',     i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Nurul Hidayah',    gender:'Perempuan', umur:'26-35', pekerjaan:'PNS/ASN',          penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Islam',          suku:'Bugis',   afiliasi:'Partai Golkar',     desa_kota:'Perkotaan',      provinsi:'Sulawesi Selatan',      kabupaten:'Makassar',        c1c:'Sudirman Said',          e1d:'Partai Golkar',  a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah', i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'5. Sangat terpercaya'},
        {name:'Oki Setiana',      gender:'Laki-laki', umur:'36-45', pekerjaan:'Swasta',           penghasilan:'3-5 juta',   pendidikan:'D3/D4',   agama:'Katolik',        suku:'Flores',  afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Nusa Tenggara Timur',   kabupaten:'Kupang',          c1c:'Purbaya Yudhi Sadewa',   e1d:'Partai Demokrat',a2f:'Perlu',        f5b:'7', a1b:'7', a2g:'Akademisi',     i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Putri Andini',     gender:'Perempuan', umur:'26-35', pekerjaan:'Wiraswasta',       penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Islam',          suku:'Jawa',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Daerah Khusus Jakarta', kabupaten:'Jakarta Utara',   c1c:'Sudirman Said',          e1d:'Partai NasDem',  a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Kepala daerah', i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Qori Fadillah',    gender:'Perempuan', umur:'17-25', pekerjaan:'Mahasiswa/Pelajar',penghasilan:'< 1 juta',   pendidikan:'SMA/SMK', agama:'Islam',          suku:'Minang',  afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Daerah Istimewa Yogyakarta',kabupaten:'Yogyakarta',c1c:'Anies Baswedan',         e1d:'PKS',            a2f:'Sangat perlu', f5b:'5', a1b:'5', a2g:'Akademisi',     i1a:'3. Hanya terdapat sesekali kebingungan',         'i1b':'4. Terpercaya'},
        {name:'Rudi Hartono',     gender:'Laki-laki', umur:'46-55', pekerjaan:'Swasta',           penghasilan:'5-10 juta',  pendidikan:'S2/S3',   agama:'Islam',          suku:'Jawa',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Jawa Timur',            kabupaten:'Surabaya',        c1c:'Sudirman Said',          e1d:'PAN',            a2f:'Perlu',        f5b:'6', a1b:'6', a2g:'Kepala daerah', i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'5. Sangat terpercaya'},
        {name:'Sinta Dewi',       gender:'Perempuan', umur:'36-45', pekerjaan:'PNS/ASN',          penghasilan:'3-5 juta',   pendidikan:'S1',      agama:'Hindu',          suku:'Bali',    afiliasi:'Tidak Berafiliasi', desa_kota:'Perkotaan',      provinsi:'Bali',                  kabupaten:'Denpasar',        c1c:'Agus Harimurti Yudhoyono',e1d:'Partai Demokrat',a2f:'Perlu',       f5b:'6', a1b:'6', a2g:'Politisi',      i1a:'4. Ia mengerti dengan sempurna semua pertanyaan','i1b':'4. Terpercaya'},
        {name:'Taufik Rahman',    gender:'Laki-laki', umur:'56+',   pekerjaan:'Petani/Buruh',     penghasilan:'1-3 juta',   pendidikan:'SD',      agama:'Islam',          suku:'Banjar',  afiliasi:'Tidak Berafiliasi', desa_kota:'Pedesaan',       provinsi:'Kalimantan Selatan',    kabupaten:'Banjarmasin',     c1c:'Dedi Mulyadi',           e1d:'PKB',            a2f:'Tidak tahu',   f5b:'5', a1b:'5', a2g:'Tokoh agama',   i1a:'2. Beberapa kesalahpahaman atas pertanyaan-pertanyaan mungkin telah terjadi','i1b':'3. Agak terpercaya'}
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
          surveyor:   'Tim LSIN',
          surveyor_understanding: d.i1a,
          surveyor_reliability:   d.i1b,
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
            g1b_factor: 'Ajakan keluarga',
            i1a_understanding: d.i1a,
            i1b_reliability:   d.i1b
          }
        };
      });
    })()
  };
}
