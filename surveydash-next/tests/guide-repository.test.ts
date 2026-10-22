import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, getDb } from '../src/lib/db';
import { getGuideState, saveGuideResult } from '../src/lib/guide-repository';
import { createSurveyorProfile } from '../src/lib/account-repository';

const directory = mkdtempSync(join(tmpdir(), 'studio-guides-'));
const keys = [
  'DATABASE_URL',
  'STAGING_DATABASE_URL',
  'VERCEL',
  'VERCEL_ENV',
  'STUDIO_DB_PATH',
  'BETTER_AUTH_SECRET',
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
for (const key of keys) delete process.env[key];
process.env.STUDIO_DB_PATH = join(directory, 'guide.sqlite');
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('hex');

test('new accounts receive the manager guide without creating a preference row on read', async () => {
  assert.deepEqual(await getGuideState('new-manager'), { role: 'manager', version: 1, status: 'new' });
  assert.equal((await getDb().prepare('SELECT count(*) AS total FROM account_guides').get())?.total, 0);
});

test('completed and skipped guides persist across connections and remain isolated per account', async () => {
  await saveGuideResult('manager-a', { status: 'completed' });
  await saveGuideResult('manager-b', { status: 'skipped' });
  await closeDatabase();
  assert.equal((await getGuideState('manager-a')).status, 'completed');
  assert.equal((await getGuideState('manager-b')).status, 'skipped');
  assert.equal((await getGuideState('manager-c')).status, 'new');
});

test('role is derived from the authenticated account profile', async () => {
  await createSurveyorProfile('guide-surveyor', {
    username: 'guide_surveyor',
    fullName: 'Surveyor Fixture',
    provinceId: 'jawa-barat',
    bankName: 'Bank Fixture',
    accountName: 'Nama Fixture',
    accountNumber: '000123456789',
    consent: true,
  });
  assert.deepEqual(await getGuideState('guide-surveyor'), { role: 'surveyor', version: 1, status: 'new' });
  await saveGuideResult('guide-surveyor', { status: 'completed' });
  assert.deepEqual(await getGuideState('guide-surveyor'), {
    role: 'surveyor',
    version: 1,
    status: 'completed',
  });
  const row = await getDb()
    .prepare('SELECT role, status FROM account_guides WHERE user_id = ?')
    .get('guide-surveyor');
  assert.deepEqual({ ...row }, { role: 'surveyor', status: 'completed' });
});

test('input cannot select another account, role, or tutorial version', async () => {
  for (const value of [
    { status: 'completed', userId: 'manager-b' },
    { status: 'completed', role: 'manager' },
    { status: 'completed', version: 99 },
    { status: 'new' },
    {},
  ]) {
    await assert.rejects(saveGuideResult('guide-surveyor', value));
  }
  assert.equal((await getGuideState('manager-b')).status, 'skipped');
});

test('replaying a skipped guide can complete it without creating duplicate rows', async () => {
  await saveGuideResult('manager-b', { status: 'completed' });
  await saveGuideResult('manager-b', { status: 'completed' });
  assert.equal((await getGuideState('manager-b')).status, 'completed');
  assert.equal(
    (await getDb().prepare('SELECT count(*) AS total FROM account_guides WHERE user_id = ?').get('manager-b'))
      ?.total,
    1,
  );
});

test.after(async () => {
  await closeDatabase();
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  rmSync(directory, { recursive: true, force: true });
});
