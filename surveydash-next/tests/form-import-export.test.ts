import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ExcelJS from 'exceljs';
import { getDb, closeDatabase } from '../src/lib/db';
import { parseFormWithResponses } from '../src/lib/form-responses-import';
import { prepareFormImport, commitFormImport } from '../src/lib/form-import-repository';
import {
  getSurvey,
  listSubmissions,
  listSurveys,
  createSurvey,
  updateSurvey,
  submitResponse,
} from '../src/lib/repository';
import { exportResponseCsv, getSurveyInsights } from '../src/lib/responses-repository';
import { exportResponseXlsx } from '../src/lib/responses-xlsx';
import { fetchGoogleFormData } from '../src/lib/google-forms';
import { parseOptionLines } from '../src/lib/question-editing';

const directory = mkdtempSync(join(tmpdir(), 'studio-import-export-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('base64url');
const form = {
  formId: 'abcdefghijklmnopqrst',
  info: { title: 'Imported historical survey' },
  items: [
    { title: 'Nama', questionItem: { question: { questionId: 'name', required: true, textQuestion: {} } } },
    { title: 'Rekening', questionItem: { question: { questionId: 'account', textQuestion: {} } } },
    {
      title: 'Penilaian',
      questionItem: {
        question: {
          questionId: 'choice',
          choiceQuestion: {
            type: 'RADIO',
            options: [{ value: 'Baik' }, { value: 'Cukup' }, { value: 'Lainnya', isOther: true }],
          },
        },
      },
    },
    { title: 'Grid', questionGroupItem: { questions: [] } },
  ],
};
function response(index: number) {
  return {
    responseId: 'source-' + index,
    createTime: '2025-01-02T03:04:05.123Z',
    answers: {
      name: { textAnswers: { answers: [{ value: index === 0 ? '=1+1' : 'Responden ' + index }] } },
      account: { textAnswers: { answers: [{ value: '0000123456789' }] } },
      choice: { textAnswers: { answers: [{ value: 'Baik' }] } },
    },
  };
}

test('historical mapping preserves source IDs, timestamps and unknown values without publishing PII', () => {
  const old = response(0);
  const latest = {
    ...old,
    lastSubmittedTime: '2025-02-03T04:05:06+07:00',
    answers: {
      ...old.answers,
      choice: { textAnswers: { answers: [{ value: 'private other answer' }] } },
      deleted: { textAnswers: { answers: [{ value: 'secret old answer' }] } },
    },
  };
  const parsed = parseFormWithResponses({ form, responses: [old, latest] });
  assert.equal(parsed.responses.length, 1);
  assert.equal(parsed.responses[0].submittedAt, '2025-02-02T21:05:06.000Z');
  assert.equal(parsed.responses[0].answers['import-q-2'], '0000123456789');
  assert.equal(parsed.responses[0].answers['import-q-3'], undefined);
  assert.ok(JSON.stringify(parsed.responses[0].raw).includes('secret old answer'));
  assert.ok(!JSON.stringify(parsed.questions).includes('private other answer'));
  assert.ok(parsed.warnings.some((w) => w.includes('2 jawaban')));
  assert.ok(parsed.questions.every((q) => !q.scored));
  assert.throws(() => parseFormWithResponses({ form, responses: [{ ...old, createTime: 'not-a-date' }] }));
  assert.deepEqual(parseOptionLines(' A\r\n\n B\n C '), ['A', 'B', 'C']);
  for (const input of [
    'one',
    'A\nA',
    Array.from({ length: 51 }, (_, i) => 'option' + i).join('\n'),
    'A\n' + 'x'.repeat(301),
  ])
    assert.throws(() => parseOptionLines(input));
});

test('staged import is private, owner/actor bound, acknowledged, atomic and retry safe; exports retain raw data', async () => {
  const owner = 'import-owner',
    actor = 'import-actor';
  const bundle = { form, responses: Array.from({ length: 121 }, (_, i) => response(i)) };
  const preview = await prepareFormImport(owner, actor, bundle, 'file');
  assert.equal(preview.responseCount, 121);
  assert.ok(!JSON.stringify(preview).includes('0000123456789'));
  const staged = await getDb()
    .prepare('SELECT ciphertext FROM form_import_batches WHERE id = ?')
    .get(preview.batchId);
  assert.ok(!String(staged.ciphertext).includes('0000123456789'));
  assert.equal((await listSurveys(owner)).length, 0);
  await assert.rejects(() => commitFormImport('other-owner', actor, preview.batchId, true), /kedaluwarsa/);
  await assert.rejects(() => commitFormImport(owner, 'other-actor', preview.batchId, true), /kedaluwarsa/);
  await assert.rejects(() => commitFormImport(owner, actor, preview.batchId, false), /catatan/);
  const results = await Promise.all([
    commitFormImport(owner, actor, preview.batchId, true),
    commitFormImport(owner, actor, preview.batchId, true),
  ]);
  assert.equal(results[0].id, results[1].id);
  const survey = results[0];
  assert.equal(survey.status, 'draft');
  assert.equal(survey.visibility, 'private');
  assert.equal(survey.kind, 'custom');
  assert.equal((await getSurvey(survey.id, owner)).responseCount, 121);
  assert.equal((await listSurveys(owner)).length, 1);
  assert.equal((await listSubmissions(survey.id))[0].submittedAt, '2025-01-02T03:04:05.123Z');
  assert.equal((await getSurveyInsights(survey.id, owner)).stats.total, 121);
  assert.equal(
    (await getDb().prepare('SELECT ciphertext FROM form_import_batches WHERE id = ?').get(preview.batchId))
      .ciphertext,
    '',
  );
  const raw = await getDb()
    .prepare('SELECT imported_by, response_id FROM submission_import_sources WHERE survey_id = ?')
    .get(survey.id);
  assert.equal(raw.imported_by, actor);
  const csv = await (
    await exportResponseCsv(survey.id, owner, { search: '=1+1' }, new AbortController().signal)
  ).text();
  assert.ok(csv.includes('0000123456789') && csv.includes('source-0') && csv.includes("'=1+1"));
  const download = await exportResponseXlsx(survey.id, owner, { pageSize: 1 }, new AbortController().signal);
  assert.equal(download.headers.get('Cache-Control'), 'no-store');
  assert.match(download.headers.get('content-type')!, /spreadsheetml/);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await download.arrayBuffer());
  const sheet = book.getWorksheet('Jawaban')!;
  assert.equal(sheet.rowCount, 122); // All rows, not just the requested page.
  const headers = sheet.getRow(1).values as string[];
  const nameCol = headers.indexOf('Nama'),
    accountCol = headers.indexOf('Rekening');
  const row = sheet.getRows(2, 121)!.find((r) => r.getCell(nameCol).value === '=1+1')!;
  assert.equal(row.getCell(nameCol).type, ExcelJS.ValueType.String);
  assert.equal(row.getCell(accountCol).value, '0000123456789');
  assert.equal(row.getCell(2).type, ExcelJS.ValueType.Date);
  assert.equal((row.getCell(2).value as Date).toISOString(), '2025-01-02T10:04:05.123Z');
  assert.equal(book.getWorksheet('Data asli 1')!.rowCount, 122);
  assert.equal(
    JSON.parse(String(book.getWorksheet('Data asli 1')!.getCell('E2').value)).responseId.startsWith(
      'source-',
    ),
    true,
  );
  const filtered = new ExcelJS.Workbook();
  await filtered.xlsx.load(
    await (
      await exportResponseXlsx(survey.id, owner, { search: '=1+1' }, new AbortController().signal)
    ).arrayBuffer(),
  );
  assert.equal(filtered.getWorksheet('Jawaban')!.rowCount, 2);
  await assert.rejects(
    () => exportResponseXlsx(survey.id, 'other', {}, new AbortController().signal),
    /tidak ditemukan/,
  );
  const expiring = await prepareFormImport(owner, actor, { form }, 'file');
  await getDb()
    .prepare('UPDATE form_import_batches SET expires_at = ? WHERE id = ?')
    .run('2000-01-01T00:00:00.000Z', expiring.batchId);
  await assert.rejects(() => commitFormImport(owner, actor, expiring.batchId, true), /kedaluwarsa/);
  const atomic = await prepareFormImport('atomic-owner', actor, bundle, 'file');
  await getDb()
    .prepare(
      "CREATE TRIGGER fail_import BEFORE INSERT ON submission_import_sources BEGIN SELECT RAISE(ABORT, 'test rollback'); END",
    )
    .run();
  await assert.rejects(() => commitFormImport('atomic-owner', actor, atomic.batchId, true), /rollback/);
  await getDb().prepare('DROP TRIGGER fail_import').run();
  assert.equal((await listSurveys('atomic-owner')).length, 0);
  assert.equal((await commitFormImport('atomic-owner', actor, atomic.batchId, true)).responseCount, 121);
});

test('Excel preserves numeric zero and decimal values and aborts cancelled downloads', async () => {
  let survey = await createSurvey('numeric-owner', 'Numeric export example', 'blank');
  survey = await updateSurvey(survey.id, survey.ownerId, {
    ...survey,
    status: 'open',
    questions: [
      {
        id: 'n',
        label: 'Angka',
        description: '',
        required: true,
        scored: false,
        options: [],
        type: 'number',
      },
    ],
  });
  await submitResponse(survey.token, { n: 0 }, 'zero');
  await submitResponse(survey.token, { n: 1.25 }, 'decimal');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    await (
      await exportResponseXlsx(survey.id, survey.ownerId, {}, new AbortController().signal)
    ).arrayBuffer(),
  );
  const values = book
    .getWorksheet('Jawaban')!
    .getRows(2, 2)!
    .map((r) => r.getCell(6).value);
  assert.deepEqual(values.sort(), [0, 1.25]);
  const controller = new AbortController();
  const aborted = await exportResponseXlsx(survey.id, survey.ownerId, {}, controller.signal);
  controller.abort();
  await assert.rejects(() => aborted.arrayBuffer());
});

test('Google fetch follows response pagination and fails instead of truncating partial pages', async () => {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(url.hostname, 'forms.googleapis.com');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token');
    return Response.json(
      !url.pathname.endsWith('/responses')
        ? form
        : url.searchParams.get('pageToken')
          ? { responses: [response(2)] }
          : { responses: [response(1)], nextPageToken: 'page 2' },
    );
  };
  const result = await fetchGoogleFormData('test-token', form.formId, true, undefined, fetcher);
  assert.equal(result.responses.length, 2);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].searchParams.get('pageToken'), 'page 2');
  calls.length = 0;
  assert.equal(
    (await fetchGoogleFormData('test-token', form.formId, false, undefined, fetcher)).responses.length,
    0,
  );
  assert.equal(calls.length, 1);
  await assert.rejects(
    () =>
      fetchGoogleFormData('test-token', form.formId, true, undefined, async (input) =>
        Response.json(String(input).includes('/responses') ? { responses: [], nextPageToken: 'loop' } : form),
      ),
    /tidak lengkap/,
  );
  await assert.rejects(
    () =>
      fetchGoogleFormData('test-token', form.formId, true, undefined, async (input) =>
        String(input).includes('/responses') ? new Response('', { status: 403 }) : Response.json(form),
      ),
    /izin/,
  );
});

test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
