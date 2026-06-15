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

  if (all.length < 2) throw new Error('Sheet kosong atau hanya ada header.');

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
