import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase } from '../src/lib/db';
import {
  createSurvey,
  getSurvey,
  listSubmissions,
  manageSurvey,
  updateSurvey,
  submitResponse,
  getTemplate,
} from '../src/lib/repository';
import {
  createPresentation,
  getPresentation,
  updatePresentation,
  refreshPresentation,
  saveSlideTemplate,
  createFromSlideTemplate,
  managePresentation,
} from '../src/lib/presentation-repository';
import { makeElement, presentationInputSchema } from '../src/lib/presentation-model';
import { parseFormsImport } from '../src/lib/forms-import';
import { assertCapacity } from '../src/lib/plans';
import { uploadAsset, getAsset } from '../src/lib/asset-repository';
import sharp from 'sharp';
const directory = mkdtempSync(join(tmpdir(), 'studio-product-tests-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
test('survey archive, trash and restore preserve submissions and isolate owners', async () => {
  let survey = await createSurvey('owner', 'Lifecycle test', 'experience');
  survey = await updateSurvey(survey.id, 'owner', { ...survey, status: 'open' });
  const answers = Object.fromEntries(
    survey.questions
      .filter((q) => q.required)
      .map((q) => [
        q.id,
        q.type === 'checkbox' ? [q.options[0].id] : q.options.length ? q.options[0].id : 'Test respondent',
      ]),
  );
  await submitResponse(survey.token, answers, 'test-request');
  const duplicate = await manageSurvey(survey.id, 'owner', 'duplicate');
  assert.equal(duplicate.status, 'draft');
  assert.notEqual(duplicate.token, survey.token);
  assert.equal((await listSubmissions(duplicate.id)).length, 0);
  await manageSurvey(survey.id, 'owner', 'archive');
  assert.equal((await getSurvey(survey.id, 'owner')).status, 'closed');
  await assert.rejects(() => submitResponse(survey.token, answers, 'new-key'), /ditutup|tersedia|menerima/);
  await manageSurvey(survey.id, 'owner', 'unarchive');
  await manageSurvey(survey.id, 'owner', 'trash');
  await manageSurvey(survey.id, 'owner', 'restore');
  assert.equal((await listSubmissions(survey.id)).length, 1);
  await assert.rejects(() => manageSurvey(survey.id, 'other', 'duplicate'), /tidak ditemukan/);
});
test('slide data is authoritative, refresh preserves notes/layout, revision and owner guards hold', async () => {
  let survey = await createSurvey('slides-owner', 'Visual test', 'experience');
  survey = await updateSurvey(survey.id, 'slides-owner', { ...survey, status: 'open' });
  const initial = await createPresentation(survey.id, 'slides-owner', 'Results deck', 'professional', [
    'summary',
    'charts',
    'conclusion',
  ]);
  const manual = makeElement('manual-note', 'text', {
    text: 'Specific action plan',
    x: 210,
    y: 520,
    w: 700,
    h: 80,
  });
  initial.slides[0].elements.push(manual);
  const bound = initial.slides[0].elements.find((e) => e.binding?.key === 'total')!;
  bound.text = '999';
  let saved = await updatePresentation(initial.id, 'slides-owner', initial);
  assert.equal(saved.slides[0].elements.find((e) => e.id === bound.id)!.text, '0');
  const answers = Object.fromEntries(
    survey.questions
      .filter((q) => q.required)
      .map((q) => [
        q.id,
        q.type === 'checkbox' ? [q.options[0].id] : q.options.length ? q.options[0].id : 'Test respondent',
      ]),
  );
  await submitResponse(survey.token, answers, 'response');
  saved = await refreshPresentation(initial.id, 'slides-owner', saved.version);
  assert.equal(saved.slides[0].elements.find((e) => e.id === bound.id)!.text, '1');
  assert.deepEqual(
    saved.slides[0].elements.find((e) => e.id === 'manual-note'),
    manual,
  );
  await assert.rejects(() => updatePresentation(initial.id, 'slides-owner', initial), /diperbarui/);
  await assert.rejects(() => getPresentation(initial.id, 'other'), /tidak ditemukan/);
  assert.equal((await getSurvey(survey.id, 'slides-owner')).version, survey.version);
  const template = await saveSlideTemplate(initial.id, 'slides-owner', 'Reusable slides');
  assert.equal(template.slidePreset!.slides[0].elements.find((e) => e.id === bound.id)!.text, '—');
  assert.ok(template.slidePreset!.slides.every((s) => s.elements.every((e) => e.data === undefined)));
  const target = await createSurvey('slides-owner', 'Another source', 'experience');
  const mappings = Object.fromEntries(target.questions.map((q) => [q.id, q.id]));
  const reused = await createFromSlideTemplate(template.id, 'slides-owner', target.id, mappings);
  assert.equal(reused.slides[0].elements.find((e) => e.binding?.key === 'total')!.text, '0');
  assert.notEqual(reused.slides[0].id, saved.slides[0].id);
  await assert.rejects(() => getTemplate(template.id, 'other'), /tidak ditemukan/);
  await assert.rejects(() => createFromSlideTemplate(template.id, 'slides-owner', target.id, {}), /sumber/);
  const copy = await managePresentation(initial.id, 'slides-owner', 'duplicate');
  assert.notEqual(copy.id, initial.id);
  await managePresentation(copy.id, 'slides-owner', 'archive');
  await assert.rejects(() => updatePresentation(copy.id, 'slides-owner', copy), /diarsipkan/);
});
test('canvas validation rejects duplicate IDs, overflow and inaccessible image assets', async () => {
  const survey = await createSurvey('asset-owner', 'Asset source', 'blank');
  const doc = await createPresentation(survey.id, 'asset-owner', 'Asset slide', 'minimal', []);
  doc.slides[0].elements.push(makeElement('outside', 'text', { x: 1200, w: 300 }));
  assert.equal(presentationInputSchema.safeParse(doc).success, false);
  doc.slides[0].elements = [makeElement('image', 'image', { assetId: 'foreign-asset' })];
  await assert.rejects(() => updatePresentation(doc.id, 'asset-owner', doc), /Gambar tidak ditemukan/);
  const buffer = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#7549df' } })
    .png()
    .toBuffer();
  const asset = await uploadAsset(
    'asset-owner',
    new File([new Uint8Array(buffer)], 'image.png', { type: 'image/png' }),
  );
  assert.equal(asset.width, 40);
  await assert.rejects(() => getAsset(asset.id, 'other'), /tidak ditemukan/);
  await assert.rejects(() => uploadAsset('asset-owner', new File(['<svg/>'], 'unsafe.svg')), /PNG/);
  doc.slides[0].elements[0].assetId = asset.id;
  await updatePresentation(doc.id, 'asset-owner', doc);
});
test('Google Form import maps supported choices and reports unsupported items without SKM assumptions', () => {
  const imported = parseFormsImport({
    info: { title: 'Imported form' },
    items: [
      {
        title: 'Choose',
        questionItem: {
          question: {
            required: true,
            choiceQuestion: {
              type: 'CHECKBOX',
              options: [{ value: 'One' }, { value: 'Two' }, { value: 'Other', isOther: true }],
            },
          },
        },
      },
      { title: 'Notes', questionItem: { question: { textQuestion: { paragraph: true } } } },
      { title: 'Upload', questionItem: { question: { fileUploadQuestion: {} } } },
    ],
  });
  assert.equal(imported.questions.length, 2);
  assert.equal(imported.questions[0].type, 'checkbox');
  assert.equal(imported.questions[1].type, 'textarea');
  assert.equal(imported.questions[0].scored, false);
  assert.equal(imported.warnings.length, 2);
  assert.throws(() => parseFormsImport({ info: { title: 'Empty form' }, items: [] }), /Tidak ada/);
});
test('configured capacities allow below limit, reject exact boundary, and allow beta without a cap', () => {
  assert.doesNotThrow(() => assertCapacity(99, 100, 'respons'));
  assert.throws(() => assertCapacity(100, 100, 'respons'), /batas|Batas|kuota/);
  assert.doesNotThrow(() => assertCapacity(1000, null, 'respons'));
});
test('automatic SKM slides include all nine scored elements', async () => {
  const survey = await createSurvey('skm-owner', 'Complete SKM slides', 'skm');
  const deck = await createPresentation(survey.id, 'skm-owner', 'Complete results', 'corporate', [
    'cover',
    'summary',
    'demographic',
    'ikm',
    'charts',
    'conclusion',
  ]);
  const questionIds = new Set(
    deck.slides.flatMap((s) =>
      s.elements.filter((e) => e.binding?.kind === 'chart').map((e) => e.binding?.questionId),
    ),
  );
  assert.ok(survey.questions.filter((q) => q.scored).every((q) => questionIds.has(q.id)));
  assert.equal(presentationInputSchema.safeParse(deck).success, true);
});
test('enabled quotas enforce opening/submission boundaries and preserve idempotent replay', async () => {
  process.env.ENFORCE_FREE_LIMITS = 'true';
  process.env.FREE_ACTIVE_SURVEY_LIMIT = '1';
  process.env.FREE_RESPONSE_LIMIT = '1';
  try {
    let first = await createSurvey('limited-owner', 'First limited form', 'blank');
    const second = await createSurvey('limited-owner', 'Second limited form', 'blank');
    first = await updateSurvey(first.id, 'limited-owner', { ...first, status: 'open' });
    await assert.rejects(
      () => updateSurvey(second.id, 'limited-owner', { ...second, status: 'open' }),
      /Batas survei aktif/,
    );
    const answers = { [first.questions[0].id]: 'Quota respondent' };
    await submitResponse(first.token, answers, 'same-request');
    await submitResponse(first.token, answers, 'same-request');
    await assert.rejects(() => submitResponse(first.token, answers, 'different-request'), /Batas respons/);
    assert.equal((await listSubmissions(first.id)).length, 1);
  } finally {
    delete process.env.ENFORCE_FREE_LIMITS;
    delete process.env.FREE_ACTIVE_SURVEY_LIMIT;
    delete process.env.FREE_RESPONSE_LIMIT;
  }
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
