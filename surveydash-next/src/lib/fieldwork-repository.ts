import { getDb } from './db';
import { getSurvey, AppError } from './repository';
import { recordActivity } from './workspace-activity';
import type { FieldworkData } from './fieldwork-model';
export async function fieldworkOverview(ownerId: string, includePayments = true): Promise<FieldworkData> {
  const rows = await getDb()
    .prepare(
      `SELECT a.id, a.survey_id, v.payload, p.full_name, p.username, a.active, r.province_id,
    d.city, d.district, d.coordinator_id, d.target, u.name AS coordinator_name, pay.amount, pay.status AS payment_status,
    count(s.id) AS total, MAX(s.submitted_at) AS last_response,
    SUM(CASE WHEN c.status = 'valid' AND c.revision = s.revision THEN 1 ELSE 0 END) AS accepted,
    SUM(CASE WHEN c.status = 'needs_verification' AND c.revision = s.revision THEN 1 ELSE 0 END) AS held,
    SUM(CASE WHEN c.status = 'excluded' AND c.revision = s.revision THEN 1 ELSE 0 END) AS excluded
    FROM surveyor_assignments a JOIN surveys v ON v.id = a.survey_id JOIN surveyor_profiles p ON p.user_id = a.surveyor_id
    LEFT JOIN surveyor_assignment_regions r ON r.assignment_id = a.id LEFT JOIN fieldwork_details d ON d.assignment_id = a.id
    LEFT JOIN "user" u ON u.id = d.coordinator_id LEFT JOIN surveyor_payments pay ON pay.assignment_id = a.id
    LEFT JOIN submission_attribution x ON x.assignment_id = a.id LEFT JOIN submissions s ON s.id = x.submission_id
    LEFT JOIN cleaning_reviews c ON c.submission_id = s.id WHERE a.owner_id = ?
    GROUP BY a.id, a.survey_id, v.payload, p.full_name, p.username, a.active, r.province_id, d.city, d.district, d.coordinator_id, d.target, u.name, pay.amount, pay.status
    ORDER BY p.full_name`,
    )
    .all(ownerId);
  const coordinators = await getDb()
    .prepare(
      `SELECT u.id, u.name FROM "user" u WHERE u.id = ? OR EXISTS (SELECT 1 FROM workspace_members m LEFT JOIN workspace_member_roles mr ON mr.owner_id = m.owner_id AND mr.user_id = m.user_id WHERE m.owner_id = ? AND m.user_id = u.id AND m.active = 1 AND COALESCE(mr.role, 'editor') <> 'viewer') ORDER BY u.name`,
    )
    .all(ownerId, ownerId);
  return {
    rows: rows
      .filter((row) => {
        const survey = JSON.parse(String(row.payload));
        return !survey.deletedAt && !survey.archivedAt;
      })
      .map((row) => ({
        assignmentId: String(row.id),
        surveyId: String(row.survey_id),
        survey: JSON.parse(String(row.payload)).title,
        name: String(row.full_name),
        username: String(row.username),
        provinceId: row.province_id ? String(row.province_id) : null,
        active: Number(row.active) === 1,
        city: String(row.city ?? ''),
        district: String(row.district ?? ''),
        coordinatorId: row.coordinator_id ? String(row.coordinator_id) : null,
        coordinatorName: String(row.coordinator_name ?? ''),
        target: row.target === null || row.target === undefined ? null : Number(row.target),
        all: Number(row.total),
        accepted: Number(row.accepted ?? 0),
        held: Number(row.held ?? 0),
        excluded: Number(row.excluded ?? 0),
        lastResponse: row.last_response ? String(row.last_response) : null,
        ...(includePayments
          ? {
              paymentAmount: Number(row.amount ?? 0),
              paymentStatus: row.payment_status === 'paid' ? ('paid' as const) : ('pending' as const),
            }
          : {}),
      })),
    coordinators: coordinators.map((row) => ({ id: String(row.id), name: String(row.name) })),
  };
}
export async function saveFieldwork(
  ownerId: string,
  actor: string,
  input: {
    assignmentId: string;
    coordinatorId?: string | null;
    city: string;
    district: string;
    target: number | null;
  },
) {
  return getDb().transaction(async () => {
    const row = await getDb()
      .prepare('SELECT survey_id FROM surveyor_assignments WHERE id = ? AND owner_id = ?')
      .get(input.assignmentId, ownerId);
    if (!row) throw new AppError('Penugasan tidak ditemukan.', 404);
    await getSurvey(String(row.survey_id), ownerId);
    if (
      input.coordinatorId &&
      input.coordinatorId !== ownerId &&
      !(await getDb()
        .prepare(
          "SELECT m.user_id FROM workspace_members m LEFT JOIN workspace_member_roles mr ON mr.owner_id = m.owner_id AND mr.user_id = m.user_id WHERE m.owner_id = ? AND m.user_id = ? AND m.active = 1 AND COALESCE(mr.role, 'editor') <> 'viewer'",
        )
        .get(ownerId, input.coordinatorId))
    )
      throw new AppError('Koordinator harus anggota aktif workspace.');
    await getDb()
      .prepare(
        `INSERT INTO fieldwork_details VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(assignment_id) DO UPDATE SET coordinator_id = excluded.coordinator_id, city = excluded.city, district = excluded.district, target = excluded.target, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .run(
        input.assignmentId,
        input.coordinatorId || null,
        input.city,
        input.district,
        input.target,
        actor,
        new Date().toISOString(),
      );
    await recordActivity(ownerId, actor, 'fieldwork.updated', input.assignmentId, input);
  });
}
export async function savePayment(
  ownerId: string,
  actor: string,
  input: { assignmentId: string; amount: number; status: 'pending' | 'paid'; note: string },
) {
  return getDb().transaction(async () => {
    const row = await getDb()
      .prepare('SELECT survey_id FROM surveyor_assignments WHERE id = ? AND owner_id = ?')
      .get(input.assignmentId, ownerId);
    if (!row) throw new AppError('Penugasan tidak ditemukan.', 404);
    await getSurvey(String(row.survey_id), ownerId);
    await getDb()
      .prepare(
        `INSERT INTO surveyor_payments VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(assignment_id) DO UPDATE SET amount = excluded.amount, status = excluded.status, note = excluded.note, actor = excluded.actor, updated_at = excluded.updated_at`,
      )
      .run(input.assignmentId, input.amount, input.status, input.note, actor, new Date().toISOString());
    await recordActivity(ownerId, actor, 'payment.recorded', input.assignmentId, input);
  });
}
