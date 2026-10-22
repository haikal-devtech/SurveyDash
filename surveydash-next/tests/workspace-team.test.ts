import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, getAuthDatabase, closeDatabase } from '../src/lib/db';
import { DatabaseSync } from 'node:sqlite';
import {
  createSurveyorProfile,
  getSurveyorProfile,
  discardUncreatedProfile,
  updateSurveyorProfile,
  surveyorRegistration,
} from '../src/lib/account-repository';
import { surveyorProfileSchema } from '../src/lib/surveyor-profile';
import { listRegisteredSurveyors } from '../src/lib/admin-surveyors';
import { surveyorDirectoryMap } from '../src/lib/surveyor-directory-map';
import {
  createWorkspaceInvitation,
  getWorkspaceInvitation,
  resolveWorkspaceInvitation,
  acceptWorkspaceInvitation,
  revokeWorkspaceInvitation,
  listWorkspaceMembers,
  setWorkspaceMemberActive,
  listAvailableWorkspaces,
} from '../src/lib/workspace-team';
import { resolveAccess, validateWorkspaceSwitch } from '../src/lib/access-repository';
import {
  createSurvey,
  updateSurvey,
  submitResponse,
  listSubmissions,
  editAnswer,
  listAudit,
  getSurvey,
} from '../src/lib/repository';
import { saveWorkspace } from '../src/lib/workspace-repository';
const directory = mkdtempSync(join(tmpdir(), 'studio-workspace-team-'));
delete process.env.DATABASE_URL;
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = 'test-only-team-secret-000000000000000000000000000000000';
const profile = (username: string, provinceId = 'jawa-barat') => ({
  username,
  fullName: 'Same Surveyor Name',
  provinceId,
  bankName: 'QA Bank',
  accountName: 'QA Payout',
  accountNumber: '0001234567',
  consent: true,
});
const token = (invite: { url: string }) => new URL(invite.url).pathname.split('/').at(-1)!;
test.before(async () => {
  await getDb().prepare('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)').run();
  for (const id of [
    'owner',
    'second-owner',
    'member',
    'outsider',
    'admin',
    'surveyor-one',
    'surveyor-two',
    'legacy-surveyor',
  ])
    await getDb()
      .prepare('INSERT INTO "user" VALUES (?, ?, ?)')
      .run(id, id, id + '@example.test');
  await getDb().prepare('INSERT INTO platform_admins VALUES (?, ?)').run('admin', new Date().toISOString());
  await createSurveyorProfile('surveyor-one', profile('registered_one'));
  await createSurveyorProfile('surveyor-two', profile('registered_two', 'papua-selatan'));
  await createSurveyorProfile('legacy-surveyor', profile('legacy_member'));
  await getDb().prepare('DELETE FROM surveyor_home_provinces WHERE user_id = ?').run('legacy-surveyor');
  await saveWorkspace('owner', { name: 'Shared research', description: 'QA shared space', locale: 'id-ID' });
});
test.after(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
test('profile/province signup writes join the auth-owned SQLite transaction without committing or rolling it back', async () => {
  const database = getAuthDatabase();
  assert.ok(database instanceof DatabaseSync);
  const input = surveyorProfileSchema.parse(profile('auth_transaction'));
  database.exec('BEGIN');
  try {
    await surveyorRegistration.run({ profile: input }, () =>
      createSurveyorProfile('auth-transaction-user', input),
    );
    assert.ok(database.isTransaction);
    assert.equal((await getSurveyorProfile('auth-transaction-user'))!.provinceId, 'jawa-barat');
  } finally {
    database.exec('ROLLBACK');
  }
  assert.equal(await getSurveyorProfile('auth-transaction-user'), null);
});
test('a failed local transaction start never rolls back an externally owned transaction', async () => {
  const database = getAuthDatabase();
  assert.ok(database instanceof DatabaseSync);
  database.exec('BEGIN');
  try {
    await assert.rejects(getDb().transaction(async () => undefined));
    assert.ok(database.isTransaction);
  } finally {
    database.exec('ROLLBACK');
  }
});
test('new surveyors require a canonical profile province; legacy profiles remain readable and orphan cleanup is complete', async () => {
  for (const provinceId of [undefined, null, '', 'invalid-province'])
    assert.equal(
      surveyorProfileSchema.safeParse({ ...profile('invalid_member'), provinceId }).success,
      false,
    );
  assert.equal((await getSurveyorProfile('surveyor-one'))!.provinceId, 'jawa-barat');
  assert.equal((await getSurveyorProfile('legacy-surveyor'))!.provinceId, null);
  await updateSurveyorProfile('surveyor-one', profile('registered_one', 'bali'));
  assert.equal((await getSurveyorProfile('surveyor-one'))!.provinceId, 'bali');
  await createSurveyorProfile('orphan-user', profile('orphan_member'));
  await discardUncreatedProfile('orphan-user');
  assert.equal(await getSurveyorProfile('orphan-user'), null);
  assert.equal(
    (
      await getDb()
        .prepare('SELECT count(*) AS total FROM surveyor_home_provinces WHERE user_id = ?')
        .get('orphan-user')
    ).total,
    0,
  );
});
test('the global admin map includes unassigned registered surveyors, preserves unknown provinces and excludes private payout/email', async () => {
  for (const actor of ['owner', 'member', 'surveyor-one'])
    await assert.rejects(listRegisteredSurveyors(actor));
  const people = await listRegisteredSurveyors('admin');
  assert.equal(people.length, 3);
  assert.ok(
    people.every((person) => Object.keys(person).sort().join(',') === 'fullName,provinceId,userId,username'),
  );
  const map = surveyorDirectoryMap(people);
  assert.equal(map.total, 3);
  assert.equal(map.unmapped, 1);
  assert.equal(map.rows.find((row) => row.id === 'bali')!.people, 1);
  assert.equal(map.rows.find((row) => row.id === 'papua-selatan')!.people, 1);
  assert.equal(map.rows.reduce((sum, row) => sum + row.people, 0) + map.unmapped, map.total);
});
test('workspace links grant only accepted manager membership, preserve attribution to the actual editor and isolate unrelated workspaces', async () => {
  await assert.rejects(createWorkspaceInvitation('owner', 'outsider'));
  await assert.rejects(createWorkspaceInvitation('owner', 'surveyor-one'));
  const invite = await createWorkspaceInvitation('owner', 'owner');
  assert.ok(Date.parse(invite.expiresAt) > Date.now() + 6 * 86400000);
  assert.deepEqual(await createWorkspaceInvitation('owner', 'owner'), invite);
  assert.deepEqual(Object.keys(await resolveWorkspaceInvitation(token(invite))).sort(), [
    'expiresAt',
    'name',
  ]);
  await assert.rejects(acceptWorkspaceInvitation(token(invite), 'surveyor-one'));
  await assert.rejects(acceptWorkspaceInvitation(token(invite), 'missing-user'));
  assert.equal((await resolveAccess('member', 'owner')).ownerId, 'member');
  const accepted = await Promise.all([
    acceptWorkspaceInvitation(token(invite), 'member'),
    acceptWorkspaceInvitation(token(invite), 'member'),
  ]);
  assert.ok(accepted.every((result) => result.ownerId === 'owner'));
  assert.equal((await listWorkspaceMembers('owner', 'owner')).length, 1);
  assert.equal(await validateWorkspaceSwitch('member', 'owner'), 'owner');
  assert.equal((await resolveAccess('member', 'owner')).ownerId, 'owner');
  assert.equal((await resolveAccess('outsider', 'owner')).ownerId, 'outsider');
  await assert.rejects(validateWorkspaceSwitch('member', 'second-owner'));
  assert.deepEqual((await listAvailableWorkspaces('member')).map((choice) => choice.ownerId).sort(), [
    'member',
    'owner',
  ]);
  for (const action of [
    () => createWorkspaceInvitation('owner', 'member'),
    () => getWorkspaceInvitation('owner', 'member'),
    () => listWorkspaceMembers('owner', 'member'),
    () => setWorkspaceMemberActive('owner', 'member', 'member', false),
  ])
    await assert.rejects(action());
  const access = await resolveAccess('member', 'owner');
  let survey = await createSurvey(access.ownerId, 'Shared study', 'blank');
  survey = await updateSurvey(survey.id, access.ownerId, { ...survey, status: 'open', visibility: 'link' });
  await submitResponse(survey.token, { [survey.questions[0].id]: 'Before edit' }, 'shared-request');
  const submission = (await listSubmissions(survey.id))[0];
  await editAnswer(
    survey.id,
    access.ownerId,
    submission.id,
    survey.questions[0].id,
    'Shared edit',
    submission.revision,
    'member',
  );
  assert.equal((await listAudit(survey.id))[0].actor, 'member');
  assert.equal((await getSurvey(survey.id, 'owner')).ownerId, 'owner');
  await assert.rejects(getSurvey(survey.id, 'member'));
  await assert.rejects(getSurvey(survey.id, 'second-owner'));
});
test('link expiry, revocation and membership revocation are independent; removed members cannot rejoin without owner action', async () => {
  const original = await getWorkspaceInvitation('owner', 'owner');
  assert.ok(original);
  await revokeWorkspaceInvitation('owner', 'owner');
  await assert.rejects(resolveWorkspaceInvitation(token(original)));
  assert.equal((await resolveAccess('member', 'owner')).ownerId, 'owner');
  const renewed = await createWorkspaceInvitation('owner', 'owner');
  assert.notEqual(renewed.url, original.url);
  await setWorkspaceMemberActive('owner', 'owner', 'member', false);
  assert.equal((await resolveAccess('member', 'owner')).ownerId, 'member');
  await assert.rejects(validateWorkspaceSwitch('member', 'owner'));
  await assert.rejects(acceptWorkspaceInvitation(token(renewed), 'member'));
  await assert.rejects(setWorkspaceMemberActive('second-owner', 'second-owner', 'member', true));
  await setWorkspaceMemberActive('owner', 'owner', 'member', true);
  assert.equal((await acceptWorkspaceInvitation(token(renewed), 'member')).ownerId, 'owner');
  await acceptWorkspaceInvitation(token(renewed), 'owner');
  assert.equal((await listWorkspaceMembers('owner', 'owner')).length, 1);
  await getDb()
    .prepare('UPDATE workspace_invitations SET expires_at = ? WHERE owner_id = ?')
    .run('2000-01-01T00:00:00.000Z', 'owner');
  await assert.rejects(acceptWorkspaceInvitation(token(renewed), 'outsider'));
  for (const invalid of ['', 'invalid', '../workspace', 'A'.repeat(32)])
    await assert.rejects(resolveWorkspaceInvitation(invalid));
});
