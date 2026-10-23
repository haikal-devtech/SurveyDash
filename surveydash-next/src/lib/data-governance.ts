import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { AppError, getSurvey, listSurveys } from './repository';
import { recordActivity } from './workspace-activity';
import type { DataRequestItem } from './data-request-model';
import { isPlatformAdmin } from './access-repository';
export async function createDataRequest(userId: string, kind: string, note: string) {
  if (
    !['access', 'correction', 'deletion', 'withdrawal'].includes(kind) ||
    note.trim().length < 10 ||
    note.length > 2000
  )
    throw new AppError('Pilih jenis permintaan dan tulis keterangan minimal 10 karakter.');
  return getDb().transaction(async () => {
    await getDb().lockOwner('data-request:' + userId);
    const recent = await getDb()
      .prepare('SELECT id FROM data_requests WHERE user_id = ? AND status IN (?, ?) LIMIT 1')
      .get(userId, 'pending', 'reviewing');
    if (recent)
      throw new AppError(
        'Permintaan sebelumnya masih ditangani. Hubungi support bila ada tambahan informasi.',
        409,
      );
    const id = randomUUID(),
      at = new Date().toISOString();
    await getDb()
      .prepare('INSERT INTO data_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, kind, note.trim(), 'pending', '', null, at, at);
    return { id, status: 'pending' };
  });
}
export async function listDataRequests(userId?: string): Promise<DataRequestItem[]> {
  const rows = await getDb()
    .prepare(
      'SELECT d.*, u.email FROM data_requests d LEFT JOIN "user" u ON u.id = d.user_id' +
        (userId ? ' WHERE d.user_id = ?' : '') +
        ' ORDER BY d.created_at DESC LIMIT 100',
    )
    .all(...(userId ? [userId] : []));
  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    ...(userId ? {} : { email: String(row.email ?? '') }),
    kind: String(row.kind),
    note: String(row.note),
    status: String(row.status),
    operatorNote: String(row.operator_note),
    createdAt: String(row.created_at),
  }));
}
export async function reviewDataRequest(id: string, actor: string, status: string, note: string) {
  if (!(await isPlatformAdmin(actor))) throw new AppError('Akses admin diperlukan.', 403);
  if (!['reviewing', 'completed', 'declined'].includes(status) || note.trim().length < 10)
    throw new AppError('Lengkapi status dan catatan penanganan.');
  if (!(await getDb().prepare('SELECT id FROM data_requests WHERE id = ?').get(id)))
    throw new AppError('Permintaan tidak ditemukan.', 404);
  await getDb().transaction(async () => {
    await getDb()
      .prepare(
        'UPDATE data_requests SET status = ?, operator_note = ?, updated_by = ?, updated_at = ? WHERE id = ?',
      )
      .run(status, note.trim(), actor, new Date().toISOString(), id);
    await recordActivity('*', actor, 'data-request.reviewed', id, { status });
  });
}
export async function retentionOverview(ownerId: string) {
  const policy = await getDb()
    .prepare('SELECT days FROM workspace_retention WHERE owner_id = ?')
    .get(ownerId);
  const days = policy ? Number(policy.days) : 90;
  return {
    days,
    automaticDeletion: false,
    trash: (await listSurveys(ownerId, true))
      .filter((survey) => survey.deletedAt)
      .map((survey) => ({
        id: survey.id,
        title: survey.title,
        deletedAt: survey.deletedAt!,
        eligible: Date.now() - Date.parse(survey.deletedAt!) >= days * 86400000,
        responses: survey.responseCount ?? 0,
      })),
  };
}
export async function saveRetention(ownerId: string, actor: string, days: number) {
  if (actor !== ownerId && !(await isPlatformAdmin(actor)))
    throw new AppError('Akses pemilik diperlukan.', 403);
  if (!Number.isInteger(days) || days < 30 || days > 3650)
    throw new AppError('Retensi sampah antara 30 dan 3650 hari.');
  await getDb().transaction(async () => {
    await getDb()
      .prepare(
        'INSERT INTO workspace_retention VALUES (?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET days = excluded.days, actor = excluded.actor, updated_at = excluded.updated_at',
      )
      .run(ownerId, days, actor, new Date().toISOString());
    await recordActivity(ownerId, actor, 'retention.updated', ownerId, { days });
  });
}
export async function purgeTrashedSurvey(
  ownerId: string,
  actor: string,
  surveyId: string,
  title: string,
  backupAcknowledged: boolean,
  reason: string,
) {
  if (actor !== ownerId && !(await isPlatformAdmin(actor)))
    throw new AppError('Akses pemilik diperlukan.', 403);
  return getDb().transaction(async () => {
    const survey = await getSurvey(surveyId, ownerId),
      policy = await retentionOverview(ownerId);
    if (!survey.deletedAt || !policy.trash.find((row) => row.id === surveyId)?.eligible)
      throw new AppError('Survei harus berada di sampah dan melewati masa retensi.');
    if (!backupAcknowledged || title !== survey.title || reason.trim().length < 10)
      throw new AppError('Konfirmasi nama survei, cadangan dan alasan penghapusan.');
    await getDb()
      .prepare(
        'DELETE FROM presentation_shares WHERE presentation_id IN (SELECT id FROM presentations WHERE survey_id = ? AND owner_id = ?)',
      )
      .run(surveyId, ownerId);
    await getDb()
      .prepare(
        'DELETE FROM dataset_version_rows WHERE version_id IN (SELECT id FROM dataset_versions WHERE survey_id = ? AND owner_id = ?)',
      )
      .run(surveyId, ownerId);
    for (const table of [
      'dataset_versions',
      'cleaning_keys',
      'cleaning_review_audit',
      'cleaning_reviews',
      'cleaning_settings',
      'submission_import_sources',
      'audit',
      'survey_province_targets',
    ])
      await getDb().prepare(`DELETE FROM ${table} WHERE survey_id = ?`).run(surveyId);
    for (const table of [
      'submission_regions',
      'submission_timing',
      'submission_weights',
      'submission_attribution',
    ])
      await getDb()
        .prepare(
          `DELETE FROM ${table} WHERE submission_id IN (SELECT id FROM submissions WHERE survey_id = ?)`,
        )
        .run(surveyId);
    await getDb().prepare('DELETE FROM submissions WHERE survey_id = ?').run(surveyId);
    for (const table of ['fieldwork_details', 'surveyor_payments', 'surveyor_assignment_regions'])
      await getDb()
        .prepare(
          `DELETE FROM ${table} WHERE assignment_id IN (SELECT id FROM surveyor_assignments WHERE survey_id = ? AND owner_id = ?)`,
        )
        .run(surveyId, ownerId);
    for (const table of [
      'surveyor_assignments',
      'surveyor_invitations',
      'presentations',
      'form_import_batches',
    ])
      await getDb()
        .prepare(`DELETE FROM ${table} WHERE survey_id = ? AND owner_id = ?`)
        .run(surveyId, ownerId);
    await getDb().prepare('DELETE FROM surveys WHERE id = ? AND owner_id = ?').run(surveyId, ownerId);
    await recordActivity(ownerId, actor, 'survey.purged', surveyId, {
      reason: reason.trim(),
      responses: survey.responseCount ?? 0,
      backupAcknowledged: true,
    });
    return { purged: true };
  });
}
