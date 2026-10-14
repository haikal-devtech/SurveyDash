import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { closeDatabase } from '../src/lib/db';
import { createSurvey, getSurvey, submitResponse, updateSurvey } from '../src/lib/repository';
import { exportResponseCsv, getResponsePage, getSurveyInsights } from '../src/lib/responses-repository';
import { presentationPreflight } from '../src/lib/presentation-preflight';
import { createPresentation } from '../src/lib/presentation-repository';
import type { Question } from '../src/lib/types';

const directory = mkdtempSync(join(tmpdir(), 'studio-response-pages-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
const questions: Question[] = [
  { id: 'name', label: 'Nama', description: '', type: 'text', required: true, scored: false, options: [] },
  {
    id: 'number',
    label: 'Angka',
    description: '',
    type: 'number',
    required: true,
    scored: false,
    options: [],
  },
  {
    id: 'choice',
    label: 'Pilihan',
    description: '',
    type: 'choice',
    required: true,
    scored: false,
    options: [
      { id: 'one', label: 'Pilihan 20%' },
      { id: 'two', label: "O'Reilly" },
    ],
  },
  {
    id: 'multiple',
    label: 'Beberapa pilihan',
    description: '',
    type: 'checkbox',
    required: false,
    scored: false,
    options: [
      { id: 'o1', label: 'Merah' },
      { id: 'o10', label: 'Biru' },
    ],
  },
];
test('response queries paginate stored rows, search display labels literally, sort numbers and protect owners', async () => {
  let survey = await createSurvey('pages-owner', 'Response query fixture', 'blank');
  survey = await updateSurvey(survey.id, survey.ownerId, { ...survey, questions, status: 'open' });
  for (let index = 1; index <= 35; index++)
    await submitResponse(
      survey.token,
      {
        name: index === 1 ? '=1+1' : 'Respons ' + index,
        number: index,
        choice: index % 2 ? 'one' : 'two',
        multiple: index % 2 ? ['o1'] : ['o10'],
      },
      'row-' + index,
    );
  assert.equal((await getSurvey(survey.id, survey.ownerId)).responseCount, 35);
  const first = await getResponsePage(survey.id, survey.ownerId, {
    sort: 'question:number',
    direction: 'asc',
  });
  assert.equal(first.rows.length, 15);
  assert.equal(first.total, 35);
  assert.equal(first.rows[0].answers.number, 1);
  assert.equal(first.rows[14].answers.number, 15);
  const last = await getResponsePage(survey.id, survey.ownerId, {
    page: 999,
    sort: 'question:number',
    direction: 'asc',
  });
  assert.equal(last.page, 3);
  assert.deepEqual(
    last.rows.map((row) => row.answers.number),
    [31, 32, 33, 34, 35],
  );
  const percent = await getResponsePage(survey.id, survey.ownerId, { search: '20%' });
  assert.equal(percent.filtered, 18);
  assert.equal((await getResponsePage(survey.id, survey.ownerId, { search: "O'Reilly" })).filtered, 17);
  assert.equal((await getResponsePage(survey.id, survey.ownerId, { search: 'Biru' })).filtered, 17);
  assert.equal((await getResponsePage(survey.id, survey.ownerId, { search: "' OR 1=1 --" })).filtered, 0);
  await assert.rejects(() => getResponsePage(survey.id, 'other', {}), /tidak ditemukan/);
  await assert.rejects(
    () => getResponsePage(survey.id, survey.ownerId, { sort: 'id; DROP TABLE submissions' }),
    /Kolom/,
  );
  await assert.rejects(() => getResponsePage(survey.id, survey.ownerId, { pageSize: 101 }));

  const response = await exportResponseCsv(
    survey.id,
    survey.ownerId,
    { pageSize: 1 },
    new AbortController().signal,
  );
  const csv = await response.text();
  assert.equal(csv.trim().split('\r\n').length, 36);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(!csv.includes('questionSnapshot'));
  const filteredCsv = await exportResponseCsv(
    survey.id,
    survey.ownerId,
    { search: 'Biru' },
    new AbortController().signal,
  );
  assert.equal((await filteredCsv.text()).trim().split('\r\n').length, 18);
  const sortedCsv = await exportResponseCsv(
    survey.id,
    survey.ownerId,
    { sort: 'question:number', direction: 'asc' },
    new AbortController().signal,
  );
  const lines = (await sortedCsv.text()).trim().split('\r\n');
  assert.ok(lines[1].includes('"\'=1+1"'));
  assert.ok(lines.at(-1)!.includes('Respons 35'));
  await assert.rejects(
    () => exportResponseCsv(survey.id, 'other', {}, new AbortController().signal),
    /tidak ditemukan/,
  );

  const insights = await getSurveyInsights(survey.id, survey.ownerId);
  assert.equal(insights.stats.total, 35);
  assert.equal(insights.questions.choice.answered, 35);
  assert.equal(insights.questions.choice.distribution.find((item) => item.name === 'Pilihan 20%')?.count, 18);
  assert.equal(insights.questions.name.samples.length, 0);
  assert.equal((await getSurveyInsights(survey.id, survey.ownerId, true)).questions.name.samples.length, 35);
  assert.ok(!('rows' in insights));
  const preflight = presentationPreflight(survey, insights, ['summary', 'demographic', 'ikm', 'charts']);
  assert.equal(preflight.find((item) => item.section === 'ikm')?.status, 'unavailable');
  assert.equal(preflight.find((item) => item.section === 'charts')?.status, 'ready');
  await assert.rejects(
    () => createPresentation(survey.id, survey.ownerId, 'Invalid IKM', 'professional', ['ikm']),
    /survei SKM/,
  );
  await assert.rejects(() => getSurveyInsights(survey.id, 'other'), /tidak ditemukan/);
});
test('empty numeric answers stay last in either direction and special question IDs are literal keys', async () => {
  const unusualId = 'number."special\\key';
  let survey = await createSurvey('optional-owner', 'Optional sorting fixture', 'blank');
  const question: Question = { ...questions[1], id: unusualId, required: false };
  survey = await updateSurvey(survey.id, survey.ownerId, {
    ...survey,
    questions: [question],
    status: 'open',
  });
  await submitResponse(survey.token, {}, 'empty');
  await submitResponse(survey.token, { [unusualId]: 2 }, 'two');
  await submitResponse(survey.token, { [unusualId]: 10 }, 'ten');
  for (const direction of ['asc', 'desc']) {
    const result = await getResponsePage(survey.id, survey.ownerId, {
      sort: 'question:' + unusualId,
      direction,
    });
    assert.deepEqual(
      result.rows.map((row) => row.answers[unusualId]),
      direction === 'asc' ? [2, 10, undefined] : [10, 2, undefined],
    );
  }
});
test('preflight distinguishes zero responses and incomplete SKM from genuine computed values', async () => {
  const survey = await createSurvey('preflight-owner', 'Empty SKM fixture', 'skm');
  const insights = await getSurveyInsights(survey.id, survey.ownerId);
  const result = presentationPreflight(survey, insights, ['summary', 'demographic', 'ikm', 'charts']);
  assert.equal(result.find((item) => item.section === 'summary')?.status, 'missing');
  assert.equal(result.find((item) => item.section === 'ikm')?.status, 'missing');
  assert.match(result.find((item) => item.section === 'ikm')!.detail, /0 dari 9/);
  assert.equal(insights.stats.ikm, null);
});
test.after(async () => {
  await closeDatabase();
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  rmSync(directory, { recursive: true, force: true });
});
