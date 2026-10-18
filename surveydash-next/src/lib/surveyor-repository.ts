import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db';
import { AppError, getSurvey, listSurveys } from './repository';
import { assertSurveyor } from './account-repository';
import { authBaseUrl } from './origins';
import { canAccessForm } from './model';
import type { Survey } from './types';
import type { SurveyorAssignment, ManagedSurveyorAssignment, SurveyorAttribution } from './surveyor-types';

const shareUrl = (token: string) => new URL('/r/' + token, authBaseUrl()).toString();
type Row = Record<string, string | number | null>;
function managed(row: Row): ManagedSurveyorAssignment {
  return {
    id: String(row.id),
    username: String(row.username),
    fullName: String(row.full_name),
    active: Number(row.active) === 1,
    shareUrl: shareUrl(String(row.token)),
    responseCount: Number(row.response_count),
    createdAt: String(row.created_at),
  };
}
const assignmentSelect = `SELECT a.*, p.username, p.full_name,
  (SELECT count(*) FROM submission_attribution x WHERE x.assignment_id = a.id) AS response_count
  FROM surveyor_assignments a JOIN surveyor_profiles p ON p.user_id = a.surveyor_id `;

export async function listManagedSurveyors(surveyId: string, ownerId: string) {
  await getSurvey(surveyId, ownerId);
  return (
    await getDb()
      .prepare(assignmentSelect + 'WHERE a.survey_id = ? AND a.owner_id = ? ORDER BY a.created_at DESC')
      .all(surveyId, ownerId)
  ).map(managed);
}
export async function listWorkspaceSurveyors(ownerId: string) {
  const surveys = await listSurveys(ownerId);
  const rows = await getDb()
    .prepare(assignmentSelect + 'WHERE a.owner_id = ? ORDER BY a.created_at DESC')
    .all(ownerId);
  const bySurvey = new Map<string, ManagedSurveyorAssignment[]>();
  for (const row of rows) {
    const id = String(row.survey_id);
    const assignments = bySurvey.get(id) ?? [];
    assignments.push(managed(row));
    bySurvey.set(id, assignments);
  }
  return surveys.map((survey) => ({
    surveyId: survey.id,
    title: survey.title,
    assignments: bySurvey.get(survey.id) ?? [],
  }));
}
export async function assignSurveyor(surveyId: string, ownerId: string, username: string, actor: string) {
  const name = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_]{2,29}$/)
    .parse(username);
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    const profile = await getDb()
      .prepare(
        'SELECT p.user_id FROM surveyor_profiles p JOIN "user" u ON u.id = p.user_id WHERE p.username = ?',
      )
      .get(name);
    if (!profile)
      throw new AppError(
        'Username Surveyor tidak ditemukan. Minta surveyor menyelesaikan pendaftaran dahulu.',
        404,
      );
    const current = await getDb()
      .prepare('SELECT * FROM surveyor_assignments WHERE survey_id = ? AND surveyor_id = ?')
      .get(surveyId, profile.user_id);
    const at = new Date().toISOString();
    if (current) {
      if (Number(current.active) !== 1)
        await getDb()
          .prepare(
            'UPDATE surveyor_assignments SET active = 1, token = ?, assigned_by = ?, updated_at = ? WHERE id = ?',
          )
          .run(randomBytes(24).toString('base64url'), actor, at, current.id);
    } else
      await getDb()
        .prepare('INSERT INTO surveyor_assignments VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
        .run(
          randomUUID(),
          surveyId,
          ownerId,
          profile.user_id,
          randomBytes(24).toString('base64url'),
          actor,
          at,
          at,
        );
    return listManagedSurveyors(surveyId, ownerId);
  });
}
export async function setAssignmentActive(
  surveyId: string,
  ownerId: string,
  assignmentId: string,
  active: boolean,
  actor: string,
) {
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    const row = await getDb()
      .prepare('SELECT * FROM surveyor_assignments WHERE id = ? AND survey_id = ? AND owner_id = ?')
      .get(assignmentId, surveyId, ownerId);
    if (!row) throw new AppError('Penugasan tidak ditemukan.', 404);
    const token =
      active && Number(row.active) !== 1 ? randomBytes(24).toString('base64url') : String(row.token);
    await getDb()
      .prepare(
        'UPDATE surveyor_assignments SET active = ?, token = ?, assigned_by = ?, updated_at = ? WHERE id = ?',
      )
      .run(active ? 1 : 0, token, actor, new Date().toISOString(), assignmentId);
    return listManagedSurveyors(surveyId, ownerId);
  });
}
export async function listSurveyorAssignments(userId: string): Promise<SurveyorAssignment[]> {
  await assertSurveyor(userId);
  const rows = await getDb()
    .prepare(
      assignmentSelect +
        'JOIN surveys v ON v.id = a.survey_id AND v.owner_id = a.owner_id WHERE a.surveyor_id = ? AND a.active = 1 ORDER BY a.created_at DESC',
    )
    .all(userId);
  const result: SurveyorAssignment[] = [];
  for (const row of rows) {
    const survey = await getSurvey(String(row.survey_id), String(row.owner_id));
    if (survey.deletedAt || survey.archivedAt) continue;
    result.push({
      id: String(row.id),
      surveyId: survey.id,
      title: survey.title,
      institution: survey.institution,
      status: survey.status,
      active: true,
      shareUrl: shareUrl(String(row.token)),
      responseCount: Number(row.response_count),
      questions: survey.questions.map((q) => ({
        ...q,
        options: q.options.map((option) => ({ id: option.id, label: option.label })),
      })),
    });
  }
  return result;
}
export async function resolveReferral(
  token: string,
  expectedSurveyId?: string,
): Promise<{ survey: Survey; attribution: SurveyorAttribution }> {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) throw new AppError('Link Surveyor tidak tersedia.', 404);
  const row = await getDb()
    .prepare(assignmentSelect + 'WHERE a.token = ?')
    .get(token);
  if (!row || Number(row.active) !== 1 || (expectedSurveyId && String(row.survey_id) !== expectedSurveyId))
    throw new AppError('Link Surveyor tidak tersedia atau sudah dicabut.', 404);
  const survey = await getSurvey(String(row.survey_id), String(row.owner_id));
  // Submission holds the survey lock first; assignment mutations use the same lock order.
  if (!canAccessForm(survey)) throw new AppError('Form tidak tersedia.', 404);
  return {
    survey,
    attribution: {
      assignmentId: String(row.id),
      surveyorId: String(row.surveyor_id),
      username: String(row.username),
      fullName: String(row.full_name),
    },
  };
}
export const attributionColumns = ', x.assignment_id, x.surveyor_id, x.username_snapshot, x.name_snapshot';
export const attributionJoin = ' LEFT JOIN submission_attribution x ON x.submission_id = s.id ';
export function parseAttribution(row: Row): SurveyorAttribution | undefined {
  return row.assignment_id
    ? {
        assignmentId: String(row.assignment_id),
        surveyorId: String(row.surveyor_id),
        username: String(row.username_snapshot),
        fullName: String(row.name_snapshot),
      }
    : undefined;
}
