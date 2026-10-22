import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { closeDatabase, getAuthDatabase, getDb } from '../src/lib/db';
import { createSurveyorProfile } from '../src/lib/account-repository';
import { AppError, createSurvey, manageSurvey, updateSurvey } from '../src/lib/repository';
import {
  assignSurveyor,
  listManagedSurveyors,
  listSurveyorAssignments,
  setAssignmentActive,
} from '../src/lib/surveyor-repository';
import {
  acceptSurveyorInvitation,
  createSurveyorInvitation,
  getManagedInvitation,
  resolveSurveyorInvitation,
  revokeSurveyorInvitation,
} from '../src/lib/surveyor-invitations';

const directory = mkdtempSync(join(tmpdir(), 'studio-surveyor-invitations-'));
const controlledEnvironment = [
  'DATABASE_URL',
  'STAGING_DATABASE_URL',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_URL',
  'STUDIO_DB_PATH',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'SURVEYOR_DATA_SECRET',
  'ENFORCE_FREE_LIMITS',
] as const;
const originalEnvironment = Object.fromEntries(
  controlledEnvironment.map((name) => [name, process.env[name]]),
);
for (const name of controlledEnvironment) delete process.env[name];
process.env.STUDIO_DB_PATH = join(directory, 'test.sqlite');
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('hex');
process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3100';
process.env.ENFORCE_FREE_LIMITS = 'false';
const payout = {
  bankName: 'Bank Simulasi Undangan',
  accountName: 'Pemilik Rekening Fixture',
  accountNumber: '000123456789654321',
};
const tokenOf = (invitation: { url: string }) => new URL(invitation.url).pathname.split('/').at(-1)!;
const statusIs = (status: number) => (error: unknown) => error instanceof AppError && error.status === status;
async function createUser(id: string) {
  await getDb().prepare('INSERT INTO "user" VALUES (?, ?, ?)').run(id, 'Nama fixture', `${id}@example.test`);
}
async function registerSurveyor(id: string, username: string) {
  await createSurveyorProfile(id, {
    username,
    fullName: 'Nama Surveyor Fixture',
    provinceId: 'jawa-barat',
    ...payout,
    consent: true,
  });
  await createUser(id);
}
async function openSurvey(ownerId: string) {
  const survey = await createSurvey(ownerId, 'Survei penugasan fixture', 'blank');
  return updateSurvey(survey.id, ownerId, { ...survey, institution: 'Instansi Fixture', status: 'open' });
}
function assertNoPayout(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    'payout_ciphertext',
    'bankName',
    'accountName',
    'accountNumber',
    ...Object.values(payout),
  ])
    assert.ok(!serialized.includes(forbidden), 'Invitation DTO must not expose surveyor payout data.');
}
test.before(() => {
  const database = getAuthDatabase();
  assert.ok(
    database instanceof DatabaseSync,
    'Invitation tests must use their own temporary SQLite database.',
  );
  database.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)');
});

test('owner creates a seven-day invitation and public resolution exposes only minimal survey metadata', async () => {
  const survey = await openSurvey('invite-owner');
  assert.equal(await getManagedInvitation(survey.id, survey.ownerId), null);
  const start = Date.now();
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, 'actual-admin-actor');
  assert.deepEqual(Object.keys(invitation).sort(), ['expiresAt', 'url']);
  assert.equal(new URL(invitation.url).origin, 'http://127.0.0.1:3100');
  assert.match(tokenOf(invitation), /^[a-zA-Z0-9_-]{32}$/);
  const expires = Date.parse(invitation.expiresAt);
  assert.ok(expires >= start + 7 * 24 * 60 * 60 * 1000);
  assert.ok(expires <= Date.now() + 7 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await getManagedInvitation(survey.id, survey.ownerId), invitation);
  const resolved = await resolveSurveyorInvitation(tokenOf(invitation));
  assert.deepEqual(resolved, { surveyId: survey.id, title: survey.title, institution: survey.institution });
  for (const forbidden of [
    'questions',
    'answers',
    'submissions',
    'ownerId',
    'token',
    'widgets',
    'username',
    'fullName',
  ])
    assert.ok(!(forbidden in resolved));
  assertNoPayout(resolved);
  await assert.rejects(
    () => createSurveyorInvitation(survey.id, 'other-owner', 'other-owner'),
    statusIs(404),
  );
  await assert.rejects(() => getManagedInvitation(survey.id, 'other-owner'), statusIs(404));
  await assert.rejects(() => revokeSurveyorInvitation(survey.id, 'other-owner'), statusIs(404));
  assert.deepEqual(await getManagedInvitation(survey.id, survey.ownerId), invitation);
});

test('expired revoked rotated and malformed invitations cannot resolve or be accepted', async () => {
  await registerSurveyor('invalid-invite-surveyor', 'invalid_invite_surveyor');
  const survey = await openSurvey('expiry-owner');
  const first = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  await getDb()
    .prepare('UPDATE surveyor_invitations SET expires_at = ? WHERE survey_id = ?')
    .run('2000-01-01T00:00:00.000Z', survey.id);
  await assert.rejects(() => resolveSurveyorInvitation(tokenOf(first)), statusIs(404));
  await assert.rejects(
    () => acceptSurveyorInvitation(tokenOf(first), 'invalid-invite-surveyor'),
    statusIs(404),
  );
  assert.equal(await getManagedInvitation(survey.id, survey.ownerId), null);
  const renewed = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  assert.notEqual(renewed.url, first.url);
  await revokeSurveyorInvitation(survey.id, survey.ownerId);
  assert.equal(await getManagedInvitation(survey.id, survey.ownerId), null);
  await assert.rejects(() => resolveSurveyorInvitation(tokenOf(renewed)), statusIs(404));
  await assert.rejects(
    () => acceptSurveyorInvitation(tokenOf(renewed), 'invalid-invite-surveyor'),
    statusIs(404),
  );
  const rotated = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  assert.notEqual(rotated.url, renewed.url);
  assert.equal((await resolveSurveyorInvitation(tokenOf(rotated))).surveyId, survey.id);
  for (const token of [
    '',
    'short',
    'x'.repeat(31),
    'x'.repeat(33),
    '../not-an-invite',
    'x'.repeat(31) + '/',
    'z'.repeat(32),
  ])
    await assert.rejects(() => resolveSurveyorInvitation(token), statusIs(404));
});

test('only completed authenticated surveyor accounts can accept and receive the invited survey', async () => {
  const survey = await openSurvey('accept-owner');
  const uninvited = await openSurvey('unrelated-owner');
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  await createUser('manager-account');
  await createSurveyorProfile('orphan-registration', {
    username: 'orphan_registration',
    fullName: 'Incomplete registration',
    provinceId: 'jawa-barat',
    ...payout,
    consent: true,
  });
  await assert.rejects(() => acceptSurveyorInvitation(tokenOf(invitation), 'manager-account'), statusIs(403));
  await assert.rejects(() => acceptSurveyorInvitation(tokenOf(invitation), 'missing-user'), statusIs(403));
  await assert.rejects(
    () => acceptSurveyorInvitation(tokenOf(invitation), 'orphan-registration'),
    statusIs(403),
  );
  await registerSurveyor('accepted-surveyor', 'accepted_surveyor');
  assert.deepEqual(await listSurveyorAssignments('accepted-surveyor'), []);
  const accepted = await acceptSurveyorInvitation(tokenOf(invitation), 'accepted-surveyor');
  assert.deepEqual(accepted, { surveyId: survey.id });
  assertNoPayout(accepted);
  const portal = await listSurveyorAssignments('accepted-surveyor');
  assert.deepEqual(
    portal.map((row) => row.surveyId),
    [survey.id],
  );
  assert.ok(!portal.some((row) => row.surveyId === uninvited.id));
  assertNoPayout(portal);
});

test('repeated invitation acceptance preserves an existing active assignment and referral URL', async () => {
  await registerSurveyor('preassigned-surveyor', 'preassigned_surveyor');
  const survey = await openSurvey('preassigned-owner');
  const original = (
    await assignSurveyor(survey.id, survey.ownerId, 'preassigned_surveyor', survey.ownerId)
  )[0];
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  for (let count = 0; count < 3; count++)
    assert.deepEqual(await acceptSurveyorInvitation(tokenOf(invitation), 'preassigned-surveyor'), {
      surveyId: survey.id,
    });
  const managed = await listManagedSurveyors(survey.id, survey.ownerId);
  assert.equal(managed.length, 1);
  assert.equal(managed[0].id, original.id);
  assert.equal(managed[0].shareUrl, original.shareUrl);
  assert.equal(managed[0].active, true);
});

test('a revoked surveyor assignment cannot be rejoined through an old or renewed invitation', async () => {
  await registerSurveyor('removed-surveyor', 'removed_surveyor');
  await registerSurveyor('fresh-surveyor', 'fresh_surveyor');
  const survey = await openSurvey('removed-owner');
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  await acceptSurveyorInvitation(tokenOf(invitation), 'removed-surveyor');
  const assignment = (await listManagedSurveyors(survey.id, survey.ownerId))[0];
  await setAssignmentActive(survey.id, survey.ownerId, assignment.id, false, survey.ownerId);
  assert.equal((await resolveSurveyorInvitation(tokenOf(invitation))).surveyId, survey.id);
  await assert.rejects(
    () => acceptSurveyorInvitation(tokenOf(invitation), 'removed-surveyor'),
    statusIs(403),
  );
  assert.deepEqual(await listSurveyorAssignments('removed-surveyor'), []);
  await revokeSurveyorInvitation(survey.id, survey.ownerId);
  const renewed = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  await assert.rejects(() => acceptSurveyorInvitation(tokenOf(renewed), 'removed-surveyor'), statusIs(403));
  await acceptSurveyorInvitation(tokenOf(renewed), 'fresh-surveyor');
  const managed = await listManagedSurveyors(survey.id, survey.ownerId);
  assert.equal(managed.find((row) => row.id === assignment.id)?.active, false);
  assert.equal(managed.find((row) => row.username === 'fresh_surveyor')?.active, true);
});

test('archived and trashed surveys reject public invitations and acceptance', async () => {
  await registerSurveyor('unavailable-surveyor', 'unavailable_surveyor');
  for (const action of ['archive', 'trash'] as const) {
    const survey = await openSurvey('unavailable-owner-' + action);
    const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
    await manageSurvey(survey.id, survey.ownerId, action);
    await assert.rejects(() => resolveSurveyorInvitation(tokenOf(invitation)), statusIs(404));
    await assert.rejects(
      () => acceptSurveyorInvitation(tokenOf(invitation), 'unavailable-surveyor'),
      statusIs(404),
    );
    assert.equal((await listManagedSurveyors(survey.id, survey.ownerId)).length, 0);
  }
});

test('concurrent acceptance creates one assignment for the surveyor', async () => {
  await registerSurveyor('parallel-surveyor', 'parallel_surveyor');
  const survey = await openSurvey('parallel-owner');
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  const results = await Promise.all(
    Array.from({ length: 4 }, () => acceptSurveyorInvitation(tokenOf(invitation), 'parallel-surveyor')),
  );
  assert.ok(results.every((result) => result.surveyId === survey.id));
  const assignments = await listManagedSurveyors(survey.id, survey.ownerId);
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].username, 'parallel_surveyor');
  assert.equal(
    Number(
      (
        await getDb()
          .prepare(
            'SELECT count(*) AS count FROM surveyor_assignments WHERE survey_id = ? AND surveyor_id = ?',
          )
          .get(survey.id, 'parallel-surveyor')
      ).count,
    ),
    1,
  );
});

test('concurrent invitation revocation and acceptance settle consistently and prevent later joins', async () => {
  await registerSurveyor('race-surveyor', 'race_surveyor');
  const survey = await openSurvey('race-owner');
  const invitation = await createSurveyorInvitation(survey.id, survey.ownerId, survey.ownerId);
  const outcomes = await Promise.allSettled([
    acceptSurveyorInvitation(tokenOf(invitation), 'race-surveyor'),
    revokeSurveyorInvitation(survey.id, survey.ownerId),
  ]);
  assert.equal(outcomes[1].status, 'fulfilled');
  const accepted = outcomes[0].status === 'fulfilled';
  if (outcomes[0].status === 'rejected') assert.ok(statusIs(404)(outcomes[0].reason));
  const assignments = await listManagedSurveyors(survey.id, survey.ownerId);
  assert.equal(assignments.length, accepted ? 1 : 0);
  assert.equal(await getManagedInvitation(survey.id, survey.ownerId), null);
  await assert.rejects(() => resolveSurveyorInvitation(tokenOf(invitation)), statusIs(404));
  await assert.rejects(() => acceptSurveyorInvitation(tokenOf(invitation), 'race-surveyor'), statusIs(404));
  assert.equal((await listManagedSurveyors(survey.id, survey.ownerId)).length, accepted ? 1 : 0);
});

test.after(async () => {
  await closeDatabase();
  for (const name of controlledEnvironment) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  rmSync(directory, { recursive: true, force: true });
});
