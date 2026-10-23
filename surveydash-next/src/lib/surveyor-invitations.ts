import { randomBytes } from 'node:crypto';
import { getDb } from './db';
import { AppError, getSurvey } from './repository';
import { assertSurveyor } from './account-repository';
import { assertSurveyorAvailable } from './surveyor-blocks';
import { assignSurveyor } from './surveyor-repository';
import { authBaseUrl } from './origins';
import type { Survey } from './types';
import { recordActivity } from './workspace-activity';

type Row = Record<string, string | number | null>;
const tokenPattern = /^[a-zA-Z0-9_-]{32}$/;
const unavailable = () => new AppError('Undangan tidak berlaku. Minta link baru kepada pengelola.', 404);
function assertAvailable(survey: Survey) {
  if (survey.archivedAt || survey.deletedAt) throw unavailable();
}
function isActive(row: Row | undefined): row is Row {
  return !!row && Number(row.active) === 1 && Date.parse(String(row.expires_at)) > Date.now();
}
function invitationView(row: Row) {
  return {
    url: new URL('/invite/surveyor/' + String(row.token), authBaseUrl()).toString(),
    expiresAt: String(row.expires_at),
  };
}
export async function getManagedInvitation(surveyId: string, ownerId: string) {
  assertAvailable(await getSurvey(surveyId, ownerId));
  const row = await getDb()
    .prepare('SELECT * FROM surveyor_invitations WHERE survey_id = ? AND owner_id = ?')
    .get(surveyId, ownerId);
  return isActive(row) ? invitationView(row) : null;
}
export async function createSurveyorInvitation(surveyId: string, ownerId: string, actor: string) {
  return getDb().transaction(async () => {
    assertAvailable(await getSurvey(surveyId, ownerId));
    const current = await getDb()
      .prepare('SELECT * FROM surveyor_invitations WHERE survey_id = ? AND owner_id = ?')
      .get(surveyId, ownerId);
    if (isActive(current)) return invitationView(current);
    const at = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const token = randomBytes(24).toString('base64url');
    await getDb()
      .prepare(
        'INSERT INTO surveyor_invitations(survey_id, owner_id, token, active, created_by, expires_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?) ON CONFLICT(survey_id) DO UPDATE SET token = excluded.token, active = 1, created_by = excluded.created_by, expires_at = excluded.expires_at, updated_at = excluded.updated_at',
      )
      .run(surveyId, ownerId, token, actor, expiresAt, at, at);
    await recordActivity(ownerId, actor, 'surveyor.invitation.created', surveyId, { expiresAt });
    return invitationView({ token, expires_at: expiresAt });
  });
}
export async function revokeSurveyorInvitation(surveyId: string, ownerId: string, actor = ownerId) {
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    await getDb()
      .prepare(
        'UPDATE surveyor_invitations SET active = 0, updated_at = ? WHERE survey_id = ? AND owner_id = ?',
      )
      .run(new Date().toISOString(), surveyId, ownerId);
    await recordActivity(ownerId, actor, 'surveyor.invitation.revoked', surveyId);
  });
}
async function resolveInvitationRow(token: string) {
  if (!tokenPattern.test(token)) throw unavailable();
  let row = await getDb().prepare('SELECT * FROM surveyor_invitations WHERE token = ?').get(token);
  if (!isActive(row)) throw unavailable();
  // All assignment/invitation mutations lock the survey first. Read the token again after the lock.
  const survey = await getSurvey(String(row.survey_id), String(row.owner_id));
  assertAvailable(survey);
  row = await getDb().prepare('SELECT * FROM surveyor_invitations WHERE token = ?').get(token);
  if (!isActive(row)) throw unavailable();
  return { row, survey };
}
export async function resolveSurveyorInvitation(token: string) {
  const { survey } = await resolveInvitationRow(token);
  return { surveyId: survey.id, title: survey.title, institution: survey.institution };
}
export async function acceptSurveyorInvitation(token: string, userId: string) {
  return getDb().transaction(async () => {
    await assertSurveyor(userId);
    const { row, survey } = await resolveInvitationRow(token);
    await assertSurveyorAvailable(survey.ownerId, userId);
    const profile = await getDb()
      .prepare(
        'SELECT p.username FROM surveyor_profiles p JOIN "user" u ON u.id = p.user_id WHERE p.user_id = ?',
      )
      .get(userId);
    if (!profile) throw new AppError('Selesaikan pendaftaran Surveyor terlebih dahulu.', 403);
    const current = await getDb()
      .prepare('SELECT active FROM surveyor_assignments WHERE survey_id = ? AND surveyor_id = ?')
      .get(survey.id, userId);
    if (current && Number(current.active) !== 1)
      throw new AppError('Penugasan Anda dinonaktifkan. Hubungi pengelola.', 403);
    if (!current) {
      await assignSurveyor(survey.id, survey.ownerId, String(profile.username), String(row.created_by));
      await recordActivity(survey.ownerId, userId, 'surveyor.invitation.accepted', survey.id);
    }
    return { surveyId: survey.id };
  });
}
