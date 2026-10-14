import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { closeDatabase } from '../src/lib/db';
import { createSurvey, manageSurvey } from '../src/lib/repository';
import {
  createPresentation,
  getPresentation,
  listPresentations,
  managePresentation,
  updatePresentation,
} from '../src/lib/presentation-repository';
import {
  getSharedPresentation,
  getSharedAsset,
  getShareStatus,
  publishPresentation,
  revokePresentation,
} from '../src/lib/share-repository';
import { uploadAsset } from '../src/lib/asset-repository';
import { makeElement } from '../src/lib/presentation-model';
const directory = mkdtempSync(join(tmpdir(), 'studio-share-tests-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
const token = (url: string) => new URL(url).pathname.split('/').at(-1)!;
test('sharing is explicit, owner scoped, version guarded and exposes a frozen minimal snapshot', async () => {
  const survey = await createSurvey('share-owner', 'Shared source', 'experience');
  let doc = await createPresentation(survey.id, 'share-owner', 'Shared results', 'professional', [
    'summary',
    'charts',
  ]);
  assert.equal((await getShareStatus(doc.id, 'share-owner')).active, false);
  await assert.rejects(() => publishPresentation(doc.id, 'share-owner', doc.version, false), /Tinjau/);
  await assert.rejects(() => publishPresentation(doc.id, 'other', doc.version, true), /tidak ditemukan/);
  await assert.rejects(() => publishPresentation(doc.id, 'share-owner', doc.version + 1, true), /berubah/);
  const first = await publishPresentation(doc.id, 'share-owner', doc.version, true);
  const key = token(first.url!);
  const publicDoc = await getSharedPresentation(key);
  assert.equal(publicDoc.title, 'Shared results');
  assert.equal(publicDoc.sourceVersion, 1);
  assert.ok(!('ownerId' in publicDoc) && !('surveyId' in publicDoc));
  assert.ok(publicDoc.slides.every((s) => s.elements.every((e) => !e.binding?.questionId)));
  doc.slides[0].elements.push(makeElement('manual', 'text', { text: 'Reviewed manual note' }));
  doc = await updatePresentation(doc.id, 'share-owner', doc);
  assert.ok(
    !(await getSharedPresentation(key)).slides[0].elements.some((e) => e.text === 'Reviewed manual note'),
  );
  const updated = await publishPresentation(doc.id, 'share-owner', doc.version, true);
  assert.equal(updated.url, first.url);
  assert.ok(
    (await getSharedPresentation(key)).slides[0].elements.some((e) => e.text === 'Reviewed manual note'),
  );
  await revokePresentation(doc.id, 'share-owner');
  await assert.rejects(() => getSharedPresentation(key), /tidak tersedia/);
  const replacement = await publishPresentation(doc.id, 'share-owner', doc.version, true);
  assert.notEqual(replacement.url, first.url);
  await assert.rejects(() => getSharedPresentation(key), /tidak tersedia/);
});
test('shared images are limited to snapshot assets and revoke/archives disable access without auto-reactivation', async () => {
  const survey = await createSurvey('image-owner', 'Image share source', 'blank');
  let doc = await createPresentation(survey.id, 'image-owner', 'Image results', 'minimal', []);
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#7549df' } })
    .png()
    .toBuffer();
  const asset = await uploadAsset('image-owner', new File([new Uint8Array(image)], 'one.png'));
  const excluded = await uploadAsset(
    'image-owner',
    new File([new Uint8Array(await sharp(image).resize(25, 25).png().toBuffer())], 'two.png'),
  );
  doc.slides[0].elements.push(makeElement('image', 'image', { assetId: asset.id }));
  doc = await updatePresentation(doc.id, 'image-owner', doc);
  let status = await publishPresentation(doc.id, 'image-owner', doc.version, true);
  let key = token(status.url!);
  assert.equal((await getSharedAsset(key, asset.id)).id, asset.id);
  await assert.rejects(() => getSharedAsset(key, excluded.id), /tidak ditemukan/);
  const copy = await managePresentation(doc.id, 'image-owner', 'duplicate');
  assert.equal((await getShareStatus(copy.id, 'image-owner')).active, false);
  await managePresentation(doc.id, 'image-owner', 'archive');
  assert.equal((await listPresentations(survey.id, 'image-owner')).length, 1);
  assert.equal((await listPresentations(survey.id, 'image-owner', true)).length, 2);
  await assert.rejects(() => getSharedAsset(key, asset.id), /tidak tersedia/);
  doc = await managePresentation(doc.id, 'image-owner', 'unarchive');
  assert.equal((await getShareStatus(doc.id, 'image-owner')).active, false);
  await assert.rejects(() => getSharedPresentation(key), /tidak tersedia/);
  status = await publishPresentation(doc.id, 'image-owner', doc.version, true);
  key = token(status.url!);
  await manageSurvey(survey.id, 'image-owner', 'trash');
  await assert.rejects(() => getSharedPresentation(key), /tidak tersedia/);
  await manageSurvey(survey.id, 'image-owner', 'restore');
  assert.equal((await getShareStatus(doc.id, 'image-owner')).active, false);
  assert.ok((await getPresentation(doc.id, 'image-owner')).slides[0].elements.length);
});
test('sharing refuses charts bound to raw free-text responses', async () => {
  const survey = await createSurvey('private-owner', 'Text source', 'blank');
  let doc = await createPresentation(survey.id, 'private-owner', 'Private table', 'minimal', []);
  doc.slides[0].elements.push(
    makeElement('table', 'chart', {
      binding: { kind: 'chart', questionId: survey.questions[0].id, chartType: 'table' },
    }),
  );
  doc = await updatePresentation(doc.id, 'private-owner', doc);
  await assert.rejects(
    () => publishPresentation(doc.id, 'private-owner', doc.version, true),
    /pertanyaan pilihan/,
  );
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
