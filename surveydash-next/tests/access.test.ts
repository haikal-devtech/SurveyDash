import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getAuthDatabase, getDb, closeDatabase } from '../src/lib/db';
import { resolveAccess, listAdminWorkspaces, validateWorkspaceSwitch } from '../src/lib/access-repository';
import {
  ensureDemoWorkspace,
  listSurveys,
  listSubmissions,
  editAnswer,
  listAudit,
} from '../src/lib/repository';
const directory = mkdtempSync(join(tmpdir(), 'studio-access-tests-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
test('explicit platform admins can select workspaces; clients cannot forge selection or see other owners, and corrections retain actual actor', async () => {
  const database = getAuthDatabase();
  assert.ok(database instanceof DatabaseSync);
  database.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)');
  for (const id of ['admin', 'client', 'other'])
    await getDb().prepare('INSERT INTO "user" VALUES (?, ?, ?)').run(id, id, `${id}@example.test`);
  await getDb().prepare('INSERT INTO platform_admins VALUES (?, ?)').run('admin', new Date().toISOString());
  assert.deepEqual(await resolveAccess('client', 'admin'), {
    ownerId: 'client',
    isAdmin: false,
    managingOther: false,
  });
  await assert.rejects(() => listAdminWorkspaces('client'), /admin/);
  await assert.rejects(() => validateWorkspaceSwitch('client', 'other'), /admin/);
  await assert.rejects(() => validateWorkspaceSwitch('admin', 'unknown'), /tidak ditemukan/);
  assert.equal((await listAdminWorkspaces('admin')).length, 3);
  assert.equal(await validateWorkspaceSwitch('admin', 'client'), 'client');
  const selected = await resolveAccess('admin', 'client');
  assert.equal(selected.ownerId, 'client');
  assert.ok(selected.managingOther);
  await ensureDemoWorkspace('client');
  assert.equal((await listSurveys('other')).length, 0);
  const survey = (await listSurveys(selected.ownerId)).find((s) => s.kind === 'skm')!;
  const submission = (await listSubmissions(survey.id))[0];
  await editAnswer(
    survey.id,
    selected.ownerId,
    submission.id,
    'name',
    'Synthetic correction',
    submission.revision,
    'admin',
  );
  assert.equal((await listAudit(survey.id))[0].actor, 'admin');
  await getDb().prepare('DELETE FROM platform_admins WHERE user_id = ?').run('admin');
  assert.equal((await resolveAccess('admin', 'client')).ownerId, 'admin');
  await assert.rejects(() => validateWorkspaceSwitch('admin', 'client'), /admin/);
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
