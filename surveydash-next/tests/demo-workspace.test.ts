import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, getDb, getAuthDatabase } from '../src/lib/db';
import { DatabaseSync } from 'node:sqlite';
import { demoSurveyorUsernames, seedAccountDemo, ensureAutomaticDemo } from '../src/lib/demo-workspace';
import { listSurveys, listSubmissions } from '../src/lib/repository';
import { listManagedSurveyors, listSurveyorAssignments } from '../src/lib/surveyor-repository';

const directory = mkdtempSync(join(tmpdir(), 'studio-demo-tests-'));
delete process.env.DATABASE_URL;
delete process.env.STAGING_DATABASE_URL;
delete process.env.VERCEL_ENV;
delete process.env.VERCEL;
process.env.STUDIO_DB_PATH = join(directory, 'demo.sqlite');

test('automatic demo: exactly 50 responses, 5 team members, isolated copies, and one-time provisioning', async () => {
  const database = getAuthDatabase() as DatabaseSync;
  database.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL)');
  const db = getDb();
  for (const [i, username] of demoSurveyorUsernames.entries()) {
    await db
      .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
      .run(`fixture-${i}`, `Surveyor Demo ${i + 1}`, `${username}@demo.surveydash.invalid`);
    await db
      .prepare('INSERT INTO surveyor_profiles VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        `fixture-${i}`,
        username,
        `Surveyor Demo ${i + 1}`,
        'unused-test-ciphertext',
        'test',
        'test',
        'test',
      );
  }
  delete process.env.STUDIO_AUTO_DEMO;
  await ensureAutomaticDemo('disabled-owner');
  assert.equal((await listSurveys('disabled-owner')).length, 0);
  process.env.STUDIO_AUTO_DEMO = 'true';
  await Promise.all([ensureAutomaticDemo('manager-a'), ensureAutomaticDemo('manager-a')]);
  const [survey] = await listSurveys('manager-a');
  assert.equal(survey.demo, true);
  assert.equal(survey.visibility, 'link');
  assert.equal(survey.responseCount, 50);
  assert.equal((await listSurveys('manager-a')).length, 1);
  const team = await listManagedSurveyors(survey.id, 'manager-a');
  assert.equal(team.length, 5);
  assert.deepEqual(
    team.map((p) => p.responseCount),
    [10, 10, 10, 10, 10],
  );
  assert.deepEqual(
    team.map((p) => p.acceptedCount),
    [10, 10, 10, 10, 10],
  );
  const responses = await listSubmissions(survey.id);
  assert.equal(new Set(responses.map((r) => r.answers.name)).size, 50);
  await seedAccountDemo('manager-b');
  const [other] = await listSurveys('manager-b');
  assert.notEqual(other.id, survey.id);
  assert.notEqual(other.token, survey.token);
  assert.equal(other.responseCount, 50);
  await db
    .prepare('UPDATE surveys SET payload = ? WHERE id = ?')
    .run(JSON.stringify({ ...survey, deletedAt: new Date().toISOString() }), survey.id);
  await ensureAutomaticDemo('manager-a');
  assert.equal((await listSurveys('manager-a')).length, 0, 'deleted demos must not respawn');
  await db
    .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
    .run('new-surveyor', 'New Surveyor', 'new@demo.invalid');
  await db
    .prepare('INSERT INTO surveyor_profiles VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('new-surveyor', 'new_surveyor', 'New Surveyor', 'unused', 'test', 'test', 'test');
  const tasks = await listSurveyorAssignments('new-surveyor');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].responseCount, 50);
  assert.equal(tasks[0].acceptedCount, 50);
  assert.equal((await listSurveyorAssignments('new-surveyor')).length, 1);
});

test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
