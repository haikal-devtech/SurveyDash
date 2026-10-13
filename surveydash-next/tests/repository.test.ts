import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { closeDatabase } from '../src/lib/db';
import {
  createSurvey,
  editAnswer,
  getSurvey,
  listAudit,
  listSubmissions,
  submitResponse,
  updateSurvey,
} from '../src/lib/repository';
const directory = mkdtempSync(join(tmpdir(), 'surveydash-tests-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');

test('form → stored response → audited correction; controls and owner isolation are enforced', async () => {
  const survey = await createSurvey('owner', 'Survei integrasi', 'blank');
  await assert.rejects(() => getSurvey(survey.id, 'another-owner'), /tidak ditemukan/);
  await assert.rejects(
    () => submitResponse(survey.token, { name: 'Contoh' }, randomUUID()),
    /tidak tersedia/,
  );
  const opened = await updateSurvey(survey.id, 'owner', { ...survey, status: 'open' });
  const key = randomUUID();
  const response = await submitResponse(opened.token, { name: 'Contoh' }, key);
  assert.equal((await listSubmissions(survey.id)).length, 1);
  assert.equal((await submitResponse(opened.token, { name: 'Contoh' }, key)).duplicate, true);
  assert.equal((await listSubmissions(survey.id)).length, 1);
  const edited = await editAnswer(survey.id, 'owner', response.id, 'name', 'Koreksi', 1);
  assert.equal(edited.answers.name, 'Koreksi');
  assert.equal(edited.revision, 2);
  assert.equal((await listAudit(survey.id))[0].before, 'Contoh');
  assert.equal((await listAudit(survey.id))[0].after, 'Koreksi');
  await assert.rejects(() => editAnswer(survey.id, 'owner', response.id, 'name', 'Lama', 1), /diperbarui/);
  await assert.rejects(() => updateSurvey(survey.id, 'owner', survey), /diperbarui/);
  const closed = await updateSurvey(survey.id, 'owner', { ...opened, status: 'closed' });
  await assert.rejects(() => submitResponse(closed.token, { name: 'Contoh' }, randomUUID()), /ditutup/);
  const privateSurvey = await updateSurvey(survey.id, 'owner', {
    ...closed,
    status: 'open',
    visibility: 'private',
  });
  await assert.rejects(
    () => submitResponse(privateSurvey.token, { name: 'Contoh' }, randomUUID()),
    /tidak tersedia/,
  );
  assert.equal((await listSubmissions(survey.id)).length, 1);
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
