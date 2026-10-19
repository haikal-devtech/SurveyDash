import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { closeDatabase, getAuthDatabase, getDb } from '../src/lib/db';
import {
  assertManager,
  assertSurveyor,
  createSurveyorProfile,
  getAccountRole,
  getSurveyorProfile,
  updateSurveyorProfile,
} from '../src/lib/account-repository';
import { listAdminWorkspaces, resolveAccess, validateWorkspaceSwitch } from '../src/lib/access-repository';
import {
  decryptPayout,
  encryptPayout,
  SURVEYOR_PRIVACY_VERSION,
  surveyorProfileSchema,
} from '../src/lib/surveyor-profile';
import {
  assignSurveyor,
  listManagedSurveyors,
  listSurveyorAssignments,
  resolveReferral,
  setAssignmentActive,
} from '../src/lib/surveyor-repository';
import {
  AppError,
  createSurvey,
  editAnswer,
  getSurvey,
  listAudit,
  listSubmissions,
  submitResponse,
  updateSurvey,
} from '../src/lib/repository';
import { exportResponseCsv, getResponsePage } from '../src/lib/responses-repository';
import type { ManagedSurveyorAssignment } from '../src/lib/surveyor-types';
import type { Question, Survey } from '../src/lib/types';

const directory = mkdtempSync(join(tmpdir(), 'studio-surveyor-tests-'));
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
  bankName: 'Bank Simulasi Privat',
  accountName: 'Pemilik Rekening Fixture',
  accountNumber: '001234500987654321',
};
const profileInput = (username: string, fullName = 'Nama Surveyor Sama') => ({
  username,
  fullName,
  ...payout,
  consent: true as const,
});
async function createAuthUser(userId: string, name = userId) {
  await getDb()
    .prepare('INSERT INTO "user" VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING')
    .run(userId, name, `${userId}@example.test`);
}
async function createRegisteredSurveyor(userId: string, input: ReturnType<typeof profileInput>) {
  await createSurveyorProfile(userId, input);
  await createAuthUser(userId, input.fullName);
}
const questions: Question[] = [
  {
    id: 'name',
    label: 'Nama responden',
    description: '',
    type: 'text',
    required: true,
    scored: false,
    options: [],
  },
  {
    id: 'service',
    label: 'Layanan',
    description: '',
    type: 'choice',
    required: true,
    scored: true,
    options: [
      { id: 'bad', label: 'Kurang', score: 1 },
      { id: 'good', label: 'Baik', score: 4 },
    ],
  },
];
async function openSurvey(ownerId: string, title: string): Promise<Survey> {
  const survey = await createSurvey(ownerId, title, 'blank');
  return updateSurvey(survey.id, ownerId, { ...survey, questions, status: 'open' });
}
const tokenOf = (assignment: ManagedSurveyorAssignment) =>
  new URL(assignment.shareUrl).pathname.split('/').at(-1)!;
const statusIs = (status: number) => (error: unknown) => error instanceof AppError && error.status === status;
function assertNoPrivateProfileData(value: unknown) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    'payout_ciphertext',
    'accountNumber',
    'accountName',
    'bankName',
    payout.accountNumber,
    payout.accountName,
    payout.bankName,
  ])
    assert.ok(!text.includes(forbidden), `Private field or value exposed: ${forbidden}`);
}

test.before(() => {
  const database = getAuthDatabase();
  assert.ok(database instanceof DatabaseSync, 'Tests must use their isolated temporary SQLite database');
  database.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT)');
});

test('surveyor usernames normalize and remain globally unique while full names may match; consent is required and payout returns masked', async () => {
  const first = profileInput('  HaiKal_Unique  ');
  first.accountNumber = '00123-4500 987654321';
  await createRegisteredSurveyor('profile-one', first);
  await createRegisteredSurveyor('profile-two', profileInput('another_username'));
  assert.equal(await getAccountRole('profile-one'), 'surveyor');
  const profile = await getSurveyorProfile('profile-one');
  assert.ok(profile);
  assert.equal(profile.username, 'haikal_unique');
  assert.equal(profile.fullName, (await getSurveyorProfile('profile-two'))!.fullName);
  assert.equal(profile.accountLast4, '4321');
  assert.ok(!('accountNumber' in profile));
  assert.ok(!('payout_ciphertext' in profile));
  assert.ok(!JSON.stringify(profile).includes(payout.accountNumber));
  assert.ok(Number.isFinite(Date.parse(profile.consentAt)));
  const stored = await getDb()
    .prepare('SELECT * FROM surveyor_profiles WHERE user_id = ?')
    .get('profile-one');
  assert.equal(stored.consent_version, SURVEYOR_PRIVACY_VERSION);
  for (const plaintext of Object.values(payout))
    assert.ok(!String(stored.payout_ciphertext).includes(plaintext));
  assert.deepEqual(decryptPayout('profile-one', String(stored.payout_ciphertext)), payout);
  await assert.rejects(
    () => createSurveyorProfile('profile-duplicate', profileInput('HAIKAL_UNIQUE')),
    statusIs(409),
  );
  assert.equal(await getSurveyorProfile('profile-duplicate'), null);
  assert.equal(await getAccountRole('profile-duplicate'), 'manager');
  await assert.rejects(() =>
    createSurveyorProfile('no-consent', { ...profileInput('no_consent'), consent: false }),
  );
  assert.equal(await getSurveyorProfile('no-consent'), null);
  for (const username of ['admin', 'has spaces', '@person', 'ab', 'x'.repeat(31)])
    assert.equal(surveyorProfileSchema.safeParse(profileInput(username)).success, false);
  await assert.rejects(
    () => updateSurveyorProfile('profile-one', profileInput('renamed_username')),
    /tidak dapat diubah/,
  );
  const updated = await updateSurveyorProfile('profile-one', {
    ...profileInput('HAIKAL_UNIQUE', 'Nama lengkap diperbarui'),
    accountNumber: '0000011119999',
  });
  assert.equal(updated?.fullName, 'Nama lengkap diperbarui');
  assert.equal(updated?.accountLast4, '9999');
  assert.equal(updated?.username, 'haikal_unique');
});

test('payout encryption uses fresh authenticated ciphertext bound to the owning account', () => {
  const encrypted = encryptPayout('crypto-owner', payout);
  assert.notEqual(encryptPayout('crypto-owner', payout), encrypted);
  assert.deepEqual(decryptPayout('crypto-owner', encrypted), payout);
  assert.throws(() => decryptPayout('another-owner', encrypted));
  const pieces = encrypted.split('.');
  const content = Buffer.from(pieces[3], 'base64url');
  content[0] ^= 1;
  pieces[3] = content.toString('base64url');
  assert.throws(() => decryptPayout('crypto-owner', pieces.join('.')));
  assert.throws(() => decryptPayout('crypto-owner', encrypted + '.extra'));
  assert.throws(() => decryptPayout('crypto-owner', 'v0.invalid.invalid.invalid'));
});

test('surveyor role cannot become a manager by forging workspace context or carrying an admin grant', async () => {
  await createRegisteredSurveyor('role-surveyor', profileInput('role_surveyor'));
  for (const id of ['role-surveyor', 'role-manager', 'role-admin']) await createAuthUser(id);
  await getDb()
    .prepare('INSERT INTO platform_admins VALUES (?, ?)')
    .run('role-admin', new Date().toISOString());
  await getDb()
    .prepare('INSERT INTO platform_admins VALUES (?, ?)')
    .run('role-surveyor', new Date().toISOString());
  await assertManager('role-manager');
  await assertSurveyor('role-surveyor');
  await assert.rejects(() => assertManager('role-surveyor'), statusIs(403));
  await assert.rejects(() => assertSurveyor('role-manager'), statusIs(403));
  await assert.rejects(() => resolveAccess('role-surveyor', 'role-manager'), statusIs(403));
  await assert.rejects(() => listAdminWorkspaces('role-surveyor'), statusIs(403));
  await assert.rejects(() => validateWorkspaceSwitch('role-surveyor', 'role-manager'), statusIs(403));
  await assert.rejects(() => validateWorkspaceSwitch('role-admin', 'role-surveyor'), statusIs(403));
  await assert.rejects(() => resolveAccess('role-admin', 'role-surveyor'), statusIs(403));
  assert.deepEqual(await resolveAccess('role-manager', 'role-admin'), {
    ownerId: 'role-manager',
    isAdmin: false,
    managingOther: false,
  });
  assert.ok(!(await listAdminWorkspaces('role-admin')).some((workspace) => workspace.id === 'role-surveyor'));
});

test('assignments expose only assigned questions without option scores or private payout, and enforce survey ownership', async () => {
  await createRegisteredSurveyor('assignment-a', profileInput('assignment_a'));
  await createRegisteredSurveyor('assignment-b', profileInput('assignment_b'));
  await createRegisteredSurveyor('assignment-unassigned', profileInput('assignment_unassigned'));
  const first = await openSurvey('assignment-owner-a', 'Assigned survey fixture');
  const second = await openSurvey('assignment-owner-b', 'Other owner survey fixture');
  const assignments = await assignSurveyor(first.id, first.ownerId, ' ASSIGNMENT_A ', first.ownerId);
  const repeated = await assignSurveyor(first.id, first.ownerId, 'assignment_a', first.ownerId);
  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].id, assignments[0].id);
  assert.equal(repeated[0].shareUrl, assignments[0].shareUrl);
  await assignSurveyor(second.id, second.ownerId, 'assignment_b', second.ownerId);
  await assert.rejects(
    () => assignSurveyor(first.id, second.ownerId, 'assignment_b', second.ownerId),
    statusIs(404),
  );
  await assert.rejects(() => listManagedSurveyors(first.id, second.ownerId), statusIs(404));
  await assert.rejects(
    () => setAssignmentActive(first.id, second.ownerId, assignments[0].id, false, second.ownerId),
    statusIs(404),
  );
  await assert.rejects(
    () => setAssignmentActive(second.id, second.ownerId, assignments[0].id, false, second.ownerId),
    statusIs(404),
  );
  await assert.rejects(
    () => assignSurveyor(first.id, first.ownerId, 'not_registered', first.ownerId),
    statusIs(404),
  );
  assert.deepEqual(await listSurveyorAssignments('assignment-unassigned'), []);
  await assert.rejects(() => listSurveyorAssignments(first.ownerId), statusIs(403));
  const portal = await listSurveyorAssignments('assignment-a');
  assert.deepEqual(
    portal.map((row) => row.surveyId),
    [first.id],
  );
  assert.equal(portal[0].questions[1].options[1].label, 'Baik');
  assert.ok(!portal[0].questions.some((q) => q.options.some((option) => 'score' in option)));
  for (const forbidden of ['answers', 'submissions', 'audit', 'ownerId', 'token', 'widgets'])
    assert.ok(!(forbidden in portal[0]));
  assertNoPrivateProfileData(portal);
  assertNoPrivateProfileData(assignments);
  assert.deepEqual(
    (await listSurveyorAssignments('assignment-b')).map((row) => row.surveyId),
    [second.id],
  );
});

test('incomplete registration cannot receive an assignment until the authenticated user record exists', async () => {
  const input = profileInput('orphan_surveyor');
  await createSurveyorProfile('orphan-surveyor', input);
  const survey = await openSurvey('orphan-owner', 'Incomplete registration fixture');
  assert.equal(await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get('orphan-surveyor'), undefined);
  await assert.rejects(
    () => assignSurveyor(survey.id, survey.ownerId, input.username, survey.ownerId),
    statusIs(404),
  );
  assert.deepEqual(await listManagedSurveyors(survey.id, survey.ownerId), []);
  await createAuthUser('orphan-surveyor', input.fullName);
  const assignments = await assignSurveyor(survey.id, survey.ownerId, input.username, survey.ownerId);
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].username, input.username);
});

test('two surveyor links persist distinct attribution; direct links stay unattributed and source is searchable and exported', async () => {
  await createRegisteredSurveyor('source-a', profileInput('source_alpha', 'Surveyor Sebelum'));
  await createRegisteredSurveyor('source-b', profileInput('source_beta', 'Surveyor Beta'));
  const survey = await openSurvey('source-owner', 'Attribution fixture');
  await assignSurveyor(survey.id, survey.ownerId, 'source_alpha', survey.ownerId);
  const assigned = await assignSurveyor(survey.id, survey.ownerId, 'source_beta', survey.ownerId);
  const alpha = assigned.find((row) => row.username === 'source_alpha')!;
  const beta = assigned.find((row) => row.username === 'source_beta')!;
  const first = await submitResponse(
    survey.token,
    { name: 'Responden satu', service: 'good', surveyorId: 'source-b' },
    'source-first',
    tokenOf(alpha),
  );
  const second = await submitResponse(
    survey.token,
    { name: 'Responden dua', service: 'bad' },
    'source-second',
    tokenOf(beta),
  );
  const direct = await submitResponse(
    survey.token,
    { name: 'Responden langsung', service: 'good' },
    'source-direct',
  );
  const rows = await listSubmissions(survey.id);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.find((row) => row.id === first.id)?.surveyor, {
    assignmentId: alpha.id,
    surveyorId: 'source-a',
    username: 'source_alpha',
    fullName: 'Surveyor Sebelum',
  });
  assert.equal(rows.find((row) => row.id === second.id)?.surveyor?.surveyorId, 'source-b');
  assert.equal(rows.find((row) => row.id === direct.id)?.surveyor, undefined);
  assert.ok(!('surveyorId' in rows.find((row) => row.id === first.id)!.answers));
  const searched = await getResponsePage(survey.id, survey.ownerId, { search: 'SOURCE_ALPHA' });
  assert.equal(searched.filtered, 1);
  assert.equal(searched.rows[0].id, first.id);
  assert.equal(
    (await getResponsePage(survey.id, survey.ownerId, { search: 'Surveyor Beta' })).rows[0].id,
    second.id,
  );
  const sorted = await getResponsePage(survey.id, survey.ownerId, { sort: 'surveyor', direction: 'asc' });
  assert.equal(sorted.rows.at(-1)?.id, direct.id);
  const csv = await (
    await exportResponseCsv(survey.id, survey.ownerId, { pageSize: 1 }, new AbortController().signal)
  ).text();
  assert.equal(csv.trim().split('\r\n').length, 4);
  assert.match(csv.split('\r\n')[0], /"Surveyor","Username surveyor","ID penugasan"/);
  assert.ok(csv.includes('"Surveyor Sebelum","source_alpha","' + alpha.id + '"'));
  assert.ok(csv.includes('"Surveyor Beta","source_beta","' + beta.id + '"'));
  const filteredCsv = await (
    await exportResponseCsv(
      survey.id,
      survey.ownerId,
      { search: 'source_beta' },
      new AbortController().signal,
    )
  ).text();
  assert.equal(filteredCsv.trim().split('\r\n').length, 2);
  assert.ok(filteredCsv.includes(second.id));
  assert.ok(!filteredCsv.includes(first.id));
  assertNoPrivateProfileData(rows);
  assertNoPrivateProfileData(csv);
  await assert.rejects(
    () => getResponsePage(survey.id, 'unrelated-owner', { search: 'source_alpha' }),
    statusIs(404),
  );
});

test('request-key retries preserve the initial source and snapshots survive profile changes and audited answer corrections', async () => {
  await createRegisteredSurveyor('retry-a', profileInput('retry_alpha', 'Nama Awal Surveyor'));
  await createRegisteredSurveyor('retry-b', profileInput('retry_beta', 'Nama Surveyor Lain'));
  const survey = await openSurvey('retry-owner', 'Retry source fixture');
  await assignSurveyor(survey.id, survey.ownerId, 'retry_alpha', survey.ownerId);
  const assigned = await assignSurveyor(survey.id, survey.ownerId, 'retry_beta', survey.ownerId);
  const alpha = assigned.find((row) => row.username === 'retry_alpha')!;
  const beta = assigned.find((row) => row.username === 'retry_beta')!;
  const first = await submitResponse(
    survey.token,
    { name: 'Jawaban asli', service: 'good' },
    'stable-key',
    tokenOf(alpha),
  );
  const before = (await listSubmissions(survey.id))[0].surveyor;
  assert.deepEqual(
    await submitResponse(
      survey.token,
      { name: 'Percobaan ubah', service: 'bad' },
      'stable-key',
      tokenOf(alpha),
    ),
    { id: first.id, duplicate: true },
  );
  await assert.rejects(
    () => submitResponse(survey.token, { name: 'Sumber lain', service: 'good' }, 'stable-key', tokenOf(beta)),
    statusIs(409),
  );
  assert.deepEqual(
    await submitResponse(survey.token, { name: 'Tanpa sumber', service: 'bad' }, 'stable-key'),
    { id: first.id, duplicate: true },
  );
  await updateSurveyorProfile('retry-a', profileInput('retry_alpha', 'Nama Baru Surveyor'));
  assert.equal((await resolveReferral(tokenOf(alpha))).attribution.fullName, 'Nama Baru Surveyor');
  assert.deepEqual(
    await submitResponse(
      survey.token,
      { name: 'Ulang setelah ganti nama', service: 'good' },
      'stable-key',
      tokenOf(alpha),
    ),
    { id: first.id, duplicate: true },
  );
  const corrected = await editAnswer(
    survey.id,
    survey.ownerId,
    first.id,
    'name',
    'Jawaban dikoreksi',
    1,
    'review-actor',
  );
  assert.equal(corrected.revision, 2);
  assert.deepEqual(corrected.surveyor, before);
  const oldRow = (await listSubmissions(survey.id))[0];
  assert.equal(oldRow.answers.name, 'Jawaban dikoreksi');
  assert.deepEqual(oldRow.surveyor, before);
  assert.equal((await listAudit(survey.id))[0].actor, 'review-actor');
  const next = await submitResponse(
    survey.token,
    { name: 'Pengiriman baru', service: 'good' },
    'next-key',
    tokenOf(alpha),
  );
  assert.equal(
    (await listSubmissions(survey.id)).find((row) => row.id === next.id)?.surveyor?.fullName,
    'Nama Baru Surveyor',
  );
  const direct = await submitResponse(
    survey.token,
    { name: 'Langsung dahulu', service: 'good' },
    'direct-key',
  );
  await assert.rejects(
    () =>
      submitResponse(
        survey.token,
        { name: 'Tambahkan sumber', service: 'good' },
        'direct-key',
        tokenOf(alpha),
      ),
    statusIs(409),
  );
  assert.equal((await listSubmissions(survey.id)).find((row) => row.id === direct.id)?.surveyor, undefined);
  assert.equal((await getSurvey(survey.id, survey.ownerId)).responseCount, 3);
});

test('invalid and cross-survey referrals never write responses; revocation blocks old links and reactivation rotates tokens', async () => {
  await createRegisteredSurveyor('lifecycle-surveyor', profileInput('lifecycle_surveyor'));
  const survey = await openSurvey('lifecycle-owner', 'Referral lifecycle fixture');
  const other = await openSurvey('lifecycle-owner', 'Other referral survey');
  const assignment = (
    await assignSurveyor(survey.id, survey.ownerId, 'lifecycle_surveyor', survey.ownerId)
  )[0];
  const initialToken = tokenOf(assignment);
  assert.equal((await resolveReferral(initialToken, survey.id)).attribution.assignmentId, assignment.id);
  for (const invalid of ['short', 'bad/token', 'z'.repeat(32)]) {
    await assert.rejects(() => resolveReferral(invalid), statusIs(404));
    await assert.rejects(
      () => submitResponse(survey.token, { name: 'Invalid', service: 'good' }, 'invalid-' + invalid, invalid),
      statusIs(404),
    );
  }
  await assert.rejects(() => resolveReferral(initialToken, other.id), statusIs(404));
  await assert.rejects(
    () =>
      submitResponse(other.token, { name: 'Cross survey', service: 'good' }, 'cross-survey', initialToken),
    statusIs(404),
  );
  assert.equal((await listSubmissions(survey.id)).length, 0);
  assert.equal((await listSubmissions(other.id)).length, 0);
  await setAssignmentActive(survey.id, survey.ownerId, assignment.id, false, survey.ownerId);
  assert.deepEqual(await listSurveyorAssignments('lifecycle-surveyor'), []);
  await assert.rejects(() => resolveReferral(initialToken), statusIs(404));
  await assert.rejects(
    () => submitResponse(survey.token, { name: 'Revoked', service: 'good' }, 'revoked', initialToken),
    statusIs(404),
  );
  const reactivated = (
    await setAssignmentActive(survey.id, survey.ownerId, assignment.id, true, survey.ownerId)
  )[0];
  assert.notEqual(tokenOf(reactivated), initialToken);
  await assert.rejects(() => resolveReferral(initialToken), statusIs(404));
  assert.equal((await resolveReferral(tokenOf(reactivated))).attribution.assignmentId, assignment.id);
  const accepted = await submitResponse(
    survey.token,
    { name: 'Aktif lagi', service: 'good' },
    'accepted',
    tokenOf(reactivated),
  );
  assert.equal((await listSubmissions(survey.id))[0].id, accepted.id);
  assert.equal((await listManagedSurveyors(survey.id, survey.ownerId))[0].responseCount, 1);
  let current = await getSurvey(survey.id, survey.ownerId);
  current = await updateSurvey(current.id, current.ownerId, { ...current, visibility: 'private' });
  await assert.rejects(() => resolveReferral(tokenOf(reactivated)), statusIs(404));
  assert.equal((await listSubmissions(survey.id)).length, 1);
  await updateSurvey(current.id, current.ownerId, { ...current, visibility: 'link', status: 'closed' });
  await assert.rejects(
    () =>
      submitResponse(survey.token, { name: 'Sudah tutup', service: 'good' }, 'closed', tokenOf(reactivated)),
    /ditutup/,
  );
  assert.equal((await listSubmissions(survey.id)).length, 1);
});

test.after(async () => {
  await closeDatabase();
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  rmSync(directory, { recursive: true, force: true });
  for (const name of controlledEnvironment) {
    const previous = originalEnvironment[name];
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
});
