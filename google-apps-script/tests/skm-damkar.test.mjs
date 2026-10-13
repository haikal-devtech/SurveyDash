import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../skm-damkar.gs', import.meta.url), 'utf8');

function loadScript(rows = [], { sheetName = 'Form Responses 1', presentationRows } = {}) {
  const makeSheet = (name, values) => ({
    getName: () => name,
    getDataRange: () => ({ getValues: () => [Array(25).fill('Header'), ...values] }),
  });
  const sheets = [makeSheet(sheetName, rows)];
  if (presentationRows) sheets.push(makeSheet('Presentasi', presentationRows));
  const context = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: name => sheets.find(s => s.getName() === name),
        getSheets: () => sheets,
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }),
    },
  });
  vm.runInContext(source, context);
  return context;
}

function respondent(answers) {
  const row = Array(25).fill('');
  row[0] = '2026-10-06';
  row[2] = 'Responden uji';
  answers.forEach((answer, i) => { row[12 + i] = answer; });
  return row;
}

test('every form option maps to its score, including case and whitespace variations', () => {
  const ctx = loadScript();
  const options = vm.runInContext('INDICATOR_OPTIONS', ctx);
  options.forEach((choices, indicator) => choices.forEach((choice, i) => {
    assert.equal(ctx.parseScore_(choice, indicator), i + 1);
    assert.equal(ctx.parseScore_('  ' + choice.toUpperCase().replaceAll(' ', '  ') + '  ', indicator), i + 1);
  }));
  assert.equal(ctx.parseScore_('c. Sesuai', 0), 3);
});

test('legacy explicit scores work and unrelated digits never silently become scores', () => {
  const ctx = loadScript();
  for (let score = 1; score <= 4; score++) {
    assert.equal(ctx.parseScore_(score, 0), score);
    assert.equal(ctx.parseScore_('Pilihan, ' + score, 0), score);
    assert.equal(ctx.parseScore_('Pilihan (' + score + ')', 0), score);
    assert.equal(ctx.parseScore_(score + '. Pilihan', 0), score);
  }
  for (const value of ['2026', '08123456789', '5', '0', 'Pilihan, 5', 'Layanan 24 jam', 'Tidak dikenal']) {
    assert.throws(() => ctx.parseScore_(value, 0), /tidak dikenali/);
  }
  for (const value of ['', '  ', null, undefined]) assert.equal(ctx.parseScore_(value, 0), null);
});

// Frekuensi anonim dari sheet DAMKAR pada 13 Oktober 2026, M2:U122.
// Tidak menyimpan identitas, kontak, ataupun pendapat responden.
const observedAnswers = [
  [['Tidak sesuai', 1], ['Kurang sesuai', 1], ['Sesuai', 73], ['Sangat sesuai', 46]],
  [['Mudah', 72], ['Sangat mudah', 49]],
  [['Cepat', 62], ['Sangat cepat', 59]],
  [['Cukup mahal', 3], ['Murah', 23], ['Gratis', 95]],
  [['Sesuai', 62], ['Sangat sesuai', 59]],
  [['Kompeten', 53], ['Sangat Kompeten', 66], ['', 2]],
  [['Sopan dan ramah', 55], ['Sangat sopan dan ramah', 66]],
  [['Tidak ada', 1], ['Ada tetapi kurang berfungsi', 1], ['Berfungsi tetapi tidak maksimal', 13], ['Dikelola dengan baik', 106]],
  [['Buruk', 1], ['Cukup', 3], ['Baik', 62], ['Sangat baik', 55]],
];

test('DAMKAR snapshot produces IKM 88.50 with 121 respondents and two missing competency answers', () => {
  const columns = observedAnswers.map(choices => choices.flatMap(([answer, count]) => Array(count).fill(answer)));
  const rows = Array.from({ length: 121 }, (_, i) => respondent(columns.map(col => col[i])));
  const ctx = loadScript([...rows, Array(25).fill('')]);
  const data = ctx.doGet();
  assert.equal(data.meta.total_respondents, 121);
  assert.equal(data.ikm.score, 88.50);
  assert.equal(data.ikm.label, 'A');
  assert.deepEqual(Array.from(data.indicators, ind => ind.distribution), [
    [1, 1, 73, 46], [0, 0, 72, 49], [0, 0, 62, 59], [0, 3, 23, 95],
    [0, 0, 62, 59], [0, 0, 53, 66], [0, 0, 55, 66], [1, 1, 13, 106], [1, 3, 62, 55],
  ]);
  assert.equal(data.indicators[5].answered_respondents, 119);
  assert.equal(data.indicators[5].missing_responses, 2);
  assert.equal(data.respondents[120].answers['Kompetensi Pelaksana'], '');
});

test('empty data returns zero, while missing and unknown answers report a useful error', () => {
  assert.equal(loadScript().doGet().ikm.score, 0);
  assert.match(loadScript([respondent(Array(9).fill(''))]).doGet().error, /belum memiliki jawaban/);
  const row = respondent(Array(9).fill(4));
  row[13] = 'Nama layanan';
  assert.match(loadScript([Array(25).fill(''), row]).doGet().error, /Baris 3, unsur 2/);
  assert.match(loadScript([], { sheetName: 'survey_settings' }).doGet().error, /Sheet respons/);
});

test('presentation mode and older response sheet capitalization still work', () => {
  const actual = respondent(Array(9).fill(3));
  const presentation = respondent(Array(9).fill(4));
  const ctx = loadScript([actual], { sheetName: 'Form responses 1', presentationRows: [presentation] });
  assert.equal(ctx.doGet().ikm.score, 75);
  assert.equal(ctx.doGet({ parameter: { mode: 'presentation' } }).ikm.score, 100);
  assert.equal(loadScript([actual]).doGet({ parameter: { mode: 'presentation' } }).ikm.score, 75);
});
