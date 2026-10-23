import { getDb } from './db';
import { AppError } from './repository';
import { recordActivity } from './workspace-activity';
import { isPlatformAdmin } from './access-repository';
export async function assertSurveyorAvailable(ownerId: string, surveyorId: string) {
  if (
    await getDb()
      .prepare(
        'SELECT surveyor_id FROM surveyor_blocks WHERE surveyor_id = ? AND active = 1 AND owner_id IN (?, ?)',
      )
      .get(surveyorId, ownerId, '*')
  )
    throw new AppError('Akses Surveyor dibatasi. Hubungi pengelola untuk peninjauan.', 403);
}
export async function setSurveyorBlock(
  ownerId: string,
  surveyorId: string,
  active: boolean,
  reason: string,
  actor: string,
) {
  if (ownerId === '*' && !(await isPlatformAdmin(actor))) throw new AppError('Akses admin diperlukan.', 403);
  if (reason.trim().length < 5 || reason.length > 1000)
    throw new AppError('Tulis alasan minimal 5 karakter.');
  return getDb().transaction(async () => {
    await getDb().lockOwner(ownerId);
    const known =
      ownerId === '*'
        ? await getDb().prepare('SELECT user_id FROM surveyor_profiles WHERE user_id = ?').get(surveyorId)
        : await getDb()
            .prepare('SELECT id FROM surveyor_assignments WHERE owner_id = ? AND surveyor_id = ? LIMIT 1')
            .get(ownerId, surveyorId);
    if (!known) throw new AppError('Surveyor tidak ditemukan pada cakupan ini.', 404);
    const at = new Date().toISOString();
    await getDb()
      .prepare(
        `INSERT INTO surveyor_blocks VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, surveyor_id) DO UPDATE SET active = excluded.active, reason = excluded.reason, actor = excluded.actor, updated_at = excluded.updated_at`,
      )
      .run(ownerId, surveyorId, active ? 1 : 0, reason.trim(), actor, at);
    // Tasks stay inactive after a block is lifted; explicit reactivation rotates their links.
    if (active)
      await getDb()
        .prepare(
          'UPDATE surveyor_assignments SET active = 0, assigned_by = ?, updated_at = ? WHERE surveyor_id = ?' +
            (ownerId === '*' ? '' : ' AND owner_id = ?'),
        )
        .run(actor, at, surveyorId, ...(ownerId === '*' ? [] : [ownerId]));
    await recordActivity(ownerId, actor, active ? 'surveyor.blocked' : 'surveyor.restored', surveyorId, {
      reason: reason.trim(),
    });
    return { active, reason: reason.trim() };
  });
}
