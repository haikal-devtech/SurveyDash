import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db';
import { AppError, getSurvey, listSurveys } from './repository';
import { assertSurveyor } from './account-repository';
import { authBaseUrl } from './origins';
import { canAccessForm } from './model';
import { isProvinceId } from './provinces';
import { assertSurveyorAvailable } from './surveyor-blocks';
import { recordActivity } from './workspace-activity';
import type { Survey } from './types';
import type {
  SurveyorAssignment,
  ManagedSurveyorAssignment,
  SurveyorAttribution,
  ProvinceTarget,
  SurveyorTeamGroup,
} from './surveyor-types';

const shareUrl = (token: string) => new URL('/r/' + token, authBaseUrl()).toString();
type Row = Record<string, string | number | null>;
function managed(row: Row): ManagedSurveyorAssignment {
  return {
    surveyorId: String(row.surveyor_id),
    blocked: Number(row.blocked ?? 0) > 0,
    acceptedCount: Number(row.accepted_count ?? 0),
    id: String(row.id),
    username: String(row.username),
    fullName: String(row.full_name),
    active: Number(row.active) === 1,
    provinceId: row.province_id ? String(row.province_id) : null,
    shareUrl: shareUrl(String(row.token)),
    responseCount: Number(row.response_count),
    createdAt: String(row.created_at),
  };
}
const assignmentSelect = `SELECT a.*, p.username, p.full_name, r.province_id, fd.city, fd.district, fd.target AS task_target,
  (SELECT count(*) FROM surveyor_blocks b WHERE b.surveyor_id = a.surveyor_id AND b.active = 1 AND b.owner_id IN (a.owner_id, '*')) AS blocked,
  (SELECT count(*) FROM submission_attribution ax JOIN submissions sx ON sx.id = ax.submission_id JOIN cleaning_reviews cr ON cr.submission_id = sx.id AND cr.revision = sx.revision AND cr.status = 'valid' WHERE ax.assignment_id = a.id) AS accepted_count,
  (SELECT count(*) FROM submission_attribution x WHERE x.assignment_id = a.id) AS response_count
  FROM surveyor_assignments a JOIN surveyor_profiles p ON p.user_id = a.surveyor_id
  LEFT JOIN surveyor_assignment_regions r ON r.assignment_id = a.id LEFT JOIN fieldwork_details fd ON fd.assignment_id = a.id `;

export async function listManagedSurveyors(surveyId: string, ownerId: string) {
  await getSurvey(surveyId, ownerId);
  return (
    await getDb()
      .prepare(assignmentSelect + 'WHERE a.survey_id = ? AND a.owner_id = ? ORDER BY a.created_at DESC')
      .all(surveyId, ownerId)
  ).map(managed);
}
export async function listWorkspaceSurveyors(ownerId: string): Promise<SurveyorTeamGroup[]> {
  // This repository is also called inside transactions using one PostgreSQL client.
  const surveys = await listSurveys(ownerId);
  const rows = await getDb()
    .prepare(assignmentSelect + 'WHERE a.owner_id = ? ORDER BY a.created_at DESC')
    .all(ownerId);
  const targetRows = await getDb()
    .prepare(
      'SELECT t.survey_id, t.province_id, t.target FROM survey_province_targets t JOIN surveys s ON s.id = t.survey_id WHERE s.owner_id = ?',
    )
    .all(ownerId);
  const bySurvey = new Map<string, ManagedSurveyorAssignment[]>();
  const regionRows = await getDb()
    .prepare(
      `SELECT s.survey_id, sr.province_id, count(*) AS total,
    SUM(CASE WHEN cr.status = 'valid' AND cr.revision = s.revision THEN 1 ELSE 0 END) AS accepted
    FROM submissions s JOIN surveys v ON v.id = s.survey_id LEFT JOIN submission_regions sr ON sr.submission_id = s.id
    LEFT JOIN cleaning_reviews cr ON cr.submission_id = s.id WHERE v.owner_id = ? GROUP BY s.survey_id, sr.province_id`,
    )
    .all(ownerId);
  for (const row of rows) {
    const id = String(row.survey_id);
    const assignments = bySurvey.get(id) ?? [];
    assignments.push(managed(row));
    bySurvey.set(id, assignments);
  }
  const targets = new Map<string, ProvinceTarget[]>();
  for (const row of targetRows) {
    const id = String(row.survey_id);
    const entries = targets.get(id) ?? [];
    entries.push({ provinceId: String(row.province_id), target: Number(row.target) });
    targets.set(id, entries);
  }
  return surveys.map((survey) => ({
    dataset: survey.dataset ?? 'all',
    provinceResponses: regionRows
      .filter((row) => row.survey_id === survey.id)
      .map((row) => ({
        provinceId: row.province_id ? String(row.province_id) : null,
        count: Number(survey.dataset === 'accepted' ? row.accepted : row.total),
      })),
    surveyId: survey.id,
    title: survey.title,
    responseCount: survey.responseCount ?? 0,
    provinceTargets: targets.get(survey.id) ?? [],
    assignments: bySurvey.get(survey.id) ?? [],
  }));
}
export async function listProvinceTargets(surveyId: string, ownerId: string): Promise<ProvinceTarget[]> {
  await getSurvey(surveyId, ownerId);
  return (
    await getDb()
      .prepare('SELECT province_id, target FROM survey_province_targets WHERE survey_id = ?')
      .all(surveyId)
  ).map((row) => ({ provinceId: String(row.province_id), target: Number(row.target) }));
}
export async function setProvinceTarget(
  surveyId: string,
  ownerId: string,
  provinceId: string,
  target: number | null,
  actor: string,
) {
  if (!isProvinceId(provinceId)) throw new AppError('Pilih provinsi yang tersedia.');
  if (target !== null && (!Number.isSafeInteger(target) || target < 1 || target > 10000000))
    throw new AppError('Target harus berupa angka bulat antara 1 dan 10.000.000.');
  return getDb().transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId);
    if (survey.deletedAt || survey.archivedAt) throw new AppError('Survei tidak tersedia.', 404);
    if (target === null) {
      await getDb()
        .prepare('DELETE FROM survey_province_targets WHERE survey_id = ? AND province_id = ?')
        .run(surveyId, provinceId);
    } else {
      await getDb()
        .prepare(
          `INSERT INTO survey_province_targets (survey_id, province_id, target, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT (survey_id, province_id) DO UPDATE SET
        target = excluded.target, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        )
        .run(surveyId, provinceId, target, actor, new Date().toISOString());
    }
    await recordActivity(ownerId, actor, 'target.updated', surveyId, { provinceId, target });
    return listProvinceTargets(surveyId, ownerId);
  });
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
    await assertSurveyorAvailable(ownerId, String(profile.user_id));
    const current = await getDb()
      .prepare('SELECT * FROM surveyor_assignments WHERE survey_id = ? AND surveyor_id = ?')
      .get(surveyId, profile.user_id);
    const at = new Date().toISOString();
    const assignmentId = current ? String(current.id) : randomUUID();
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
          assignmentId,
          surveyId,
          ownerId,
          profile.user_id,
          randomBytes(24).toString('base64url'),
          actor,
          at,
          at,
        );
    if (!current || Number(current.active) !== 1)
      await recordActivity(
        ownerId,
        actor,
        current ? 'assignment.activated' : 'assignment.created',
        assignmentId,
        { surveyId, surveyorId: String(profile.user_id) },
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
    if (active) await assertSurveyorAvailable(ownerId, String(row.surveyor_id));
    const token =
      active && Number(row.active) !== 1 ? randomBytes(24).toString('base64url') : String(row.token);
    await getDb()
      .prepare(
        'UPDATE surveyor_assignments SET active = ?, token = ?, assigned_by = ?, updated_at = ? WHERE id = ?',
      )
      .run(active ? 1 : 0, token, actor, new Date().toISOString(), assignmentId);
    await recordActivity(
      ownerId,
      actor,
      active ? 'assignment.activated' : 'assignment.deactivated',
      assignmentId,
      { surveyId },
    );
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
      acceptedCount: Number(row.accepted_count ?? 0),
      target: row.task_target === null || row.task_target === undefined ? null : Number(row.task_target),
      city: String(row.city ?? ''),
      district: String(row.district ?? ''),
      active: true,
      provinceId: row.province_id ? String(row.province_id) : null,
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
export async function setAssignmentProvince(
  surveyId: string,
  ownerId: string,
  assignmentId: string,
  provinceId: string | null,
  actor: string,
) {
  if (provinceId !== null && !isProvinceId(provinceId)) throw new AppError('Pilih provinsi yang tersedia.');
  return getDb().transaction(async () => {
    await getSurvey(surveyId, ownerId);
    const assignment = await getDb()
      .prepare('SELECT id FROM surveyor_assignments WHERE id = ? AND survey_id = ? AND owner_id = ?')
      .get(assignmentId, surveyId, ownerId);
    if (!assignment) throw new AppError('Penugasan tidak ditemukan.', 404);
    const at = new Date().toISOString();
    if (provinceId === null) {
      await getDb()
        .prepare('DELETE FROM surveyor_assignment_regions WHERE assignment_id = ?')
        .run(assignmentId);
    } else {
      await getDb()
        .prepare(
          `INSERT INTO surveyor_assignment_regions (assignment_id, province_id, updated_by, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT (assignment_id) DO UPDATE SET
        province_id = excluded.province_id, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        )
        .run(assignmentId, provinceId, actor, at);
    }
    await getDb()
      .prepare('UPDATE surveyor_assignments SET assigned_by = ?, updated_at = ? WHERE id = ?')
      .run(actor, at, assignmentId);
    await recordActivity(ownerId, actor, 'assignment.province', assignmentId, { surveyId, provinceId });
    return listManagedSurveyors(surveyId, ownerId);
  });
}
export async function resolveReferral(
  token: string,
  expectedSurveyId?: string,
  lockedSurvey?: Survey,
): Promise<{ survey: Survey; attribution: SurveyorAttribution }> {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) throw new AppError('Link Surveyor tidak tersedia.', 404);
  const row = await getDb()
    .prepare(assignmentSelect + 'WHERE a.token = ?')
    .get(token);
  if (!row || Number(row.active) !== 1 || (expectedSurveyId && String(row.survey_id) !== expectedSurveyId))
    throw new AppError('Link Surveyor tidak tersedia atau sudah dicabut.', 404);
  await assertSurveyorAvailable(String(row.owner_id), String(row.surveyor_id));
  const survey = lockedSurvey ?? (await getSurvey(String(row.survey_id), String(row.owner_id)));
  // Submission holds the survey lock first; assignment mutations use the same lock order.
  if (!canAccessForm(survey)) throw new AppError('Form tidak tersedia.', 404);
  return {
    survey,
    attribution: {
      provinceId: row.province_id ? String(row.province_id) : null,
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
