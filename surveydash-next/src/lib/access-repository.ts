import { getDb } from './db';
import { AppError } from './repository';
export const WORKSPACE_COOKIE = 'studio_workspace';
export async function isPlatformAdmin(userId: string) {
  return !!(await getDb().prepare('SELECT user_id FROM platform_admins WHERE user_id = ?').get(userId));
}
export async function resolveAccess(userId: string, selectedOwnerId?: string) {
  const admin = await isPlatformAdmin(userId);
  let ownerId = userId;
  if (admin && selectedOwnerId && selectedOwnerId !== userId) {
    const owner = await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(selectedOwnerId);
    if (owner) ownerId = String(owner.id);
  }
  return { ownerId, isAdmin: admin, managingOther: ownerId !== userId };
}
export async function listAdminWorkspaces(userId: string) {
  if (!(await isPlatformAdmin(userId))) throw new AppError('Akses admin diperlukan.', 403);
  const rows = await getDb()
    .prepare(
      'SELECT u.id, u.name, u.email, a.user_id AS admin_id, w.payload FROM "user" u LEFT JOIN platform_admins a ON a.user_id = u.id LEFT JOIN workspace_settings w ON w.owner_id = u.id ORDER BY u.name',
    )
    .all();
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    isAdmin: !!row.admin_id,
    workspaceName: row.payload ? String(JSON.parse(String(row.payload)).name) : 'Workspace survei',
  }));
}
export async function validateWorkspaceSwitch(userId: string, ownerId: string) {
  if (ownerId !== userId && !(await isPlatformAdmin(userId)))
    throw new AppError('Akses admin diperlukan.', 403);
  if (!(await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(ownerId)))
    throw new AppError('Workspace tidak ditemukan.', 404);
  return ownerId;
}
