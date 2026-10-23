import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDb, closeDatabase } from '../src/lib/db';
import { createSurvey, updateSurvey, submitResponse, manageSurvey, getSurvey } from '../src/lib/repository';
import {
  createDataRequest,
  listDataRequests,
  reviewDataRequest,
  saveRetention,
  purgeTrashedSurvey,
  retentionOverview,
} from '../src/lib/data-governance';
import { freezeDataset } from '../src/lib/dataset-repository';
import { createPresentation } from '../src/lib/presentation-repository';
import { createSurveyorProfile } from '../src/lib/account-repository';
import { assignSurveyor, setAssignmentProvince } from '../src/lib/surveyor-repository';
import { setSurveyorBlock } from '../src/lib/surveyor-blocks';
const folder = mkdtempSync(join(tmpdir(), 'studio-data-governance-'));
assert.ok(resolve(folder).startsWith(resolve(tmpdir()) + sep));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(folder, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = 'test-only-data-governance-secret-000000000000000000000';
test.before(async () => {
  await getDb().prepare('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)').run();
  for (const id of ['owner', 'other', 'admin', 'surveyor'])
    await getDb()
      .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
      .run(id, id, id + '@example.test');
  await getDb().prepare('INSERT INTO platform_admins VALUES (?, ?)').run('admin', new Date().toISOString());
});
test.after(async () => {
  await closeDatabase();
  assert.ok(resolve(folder).startsWith(resolve(tmpdir()) + sep));
  rmSync(folder, { recursive: true, force: true });
});
test('data requests remain scoped to their account and require an actual platform admin for handling', async () => {
  const request = await createDataRequest('owner', 'access', 'Please provide a copy of my profile data');
  assert.equal((await listDataRequests('owner')).length, 1);
  assert.equal((await listDataRequests('other')).length, 0);
  assert.equal((await listDataRequests('owner'))[0].email, undefined);
  await assert.rejects(
    () => createDataRequest('owner', 'deletion', 'Another pending request for the same account'),
    /sebelumnya/,
  );
  await assert.rejects(
    () => reviewDataRequest(request.id, 'other', 'completed', 'Unauthorized handling attempt'),
    /admin/,
  );
  await reviewDataRequest(
    request.id,
    'admin',
    'completed',
    'Identity verified; a copy was provided by operator',
  );
  assert.equal((await listDataRequests('owner'))[0].status, 'completed');
  await assert.rejects(
    () => setSurveyorBlock('*', 'surveyor', true, 'Unauthorized global block request', 'owner'),
    /admin/,
  );
});
test('permanent survey deletion requires owner/admin, retention, exact title and backup acknowledgment and removes dependent snapshots safely', async () => {
  let survey = await createSurvey('owner', 'Retained QA survey', 'blank');
  survey = await updateSurvey(survey.id, 'owner', { ...survey, status: 'open', visibility: 'link' });
  await createSurveyorProfile('surveyor', {
    username: 'retention_qa',
    fullName: 'QA Surveyor',
    provinceId: 'bali',
    bankName: 'QA',
    accountName: 'QA Name',
    accountNumber: '000123456',
    consent: true,
  });
  const task = (await assignSurveyor(survey.id, 'owner', 'retention_qa', 'owner'))[0];
  await setAssignmentProvince(survey.id, 'owner', task.id, 'bali', 'owner');
  const answers = Object.fromEntries(
    survey.questions.map((q) => [
      q.id,
      q.type === 'number'
        ? 0
        : q.type === 'checkbox'
          ? [q.options[0].id]
          : q.options.length
            ? q.options[0].id
            : q.type === 'date'
              ? '2026-10-23'
              : 'QA response',
    ]),
  );
  await submitResponse(
    survey.token,
    answers,
    randomUUID(),
    new URL(task.shareUrl).pathname.split('/').at(-1),
    new Date().toISOString(),
  );
  await createPresentation(survey.id, 'owner', 'QA retained presentation', 'professional', ['cover']);
  survey = await updateSurvey(survey.id, 'owner', { ...survey, status: 'closed' });
  await freezeDataset(survey.id, 'owner', 'owner', {
    name: 'QA final',
    dataset: 'all',
    methodNotes: 'Reviewed final QA dataset',
    acknowledged: true,
  });
  await manageSurvey(survey.id, 'owner', 'trash');
  await saveRetention('owner', 'owner', 30);
  await assert.rejects(
    () =>
      purgeTrashedSurvey(
        'owner',
        'owner',
        survey.id,
        survey.title,
        true,
        'Reviewed retention and backup requirements',
      ),
    /retensi/,
  );
  const stored = await getSurvey(survey.id, 'owner');
  stored.deletedAt = new Date(Date.now() - 45 * 86400000).toISOString();
  await getDb().prepare('UPDATE surveys SET payload = ? WHERE id = ?').run(JSON.stringify(stored), survey.id);
  assert.equal((await retentionOverview('owner')).trash[0].eligible, true);
  await assert.rejects(
    () =>
      purgeTrashedSurvey(
        'owner',
        'other',
        survey.id,
        survey.title,
        true,
        'Reviewed retention and backup requirements',
      ),
    /pemilik/,
  );
  await assert.rejects(
    () =>
      purgeTrashedSurvey(
        'owner',
        'owner',
        survey.id,
        'Wrong title',
        true,
        'Reviewed retention and backup requirements',
      ),
    /Konfirmasi/,
  );
  await assert.rejects(
    () =>
      purgeTrashedSurvey(
        'owner',
        'owner',
        survey.id,
        survey.title,
        false,
        'Reviewed retention and backup requirements',
      ),
    /Konfirmasi/,
  );
  assert.equal(
    (
      await purgeTrashedSurvey(
        'owner',
        'owner',
        survey.id,
        survey.title,
        true,
        'Reviewed retention and backup requirements',
      )
    ).purged,
    true,
  );
  await assert.rejects(() => getSurvey(survey.id, 'owner'));
  for (const table of [
    'submissions',
    'dataset_versions',
    'dataset_version_rows',
    'presentations',
    'surveyor_assignments',
    'submission_regions',
    'submission_timing',
  ])
    assert.equal(Number((await getDb().prepare(`SELECT count(*) AS n FROM ${table}`).get()).n), 0);
  assert.ok(await getDb().prepare("SELECT id FROM workspace_activity WHERE action = 'survey.purged'").get());
});
