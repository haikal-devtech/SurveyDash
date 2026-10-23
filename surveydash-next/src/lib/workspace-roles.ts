import { getDb } from './db';
import { AppError } from './repository';
import { workspaceRoles, type WorkspaceRole } from './workspace-role-model';
export { workspaceRoles, workspaceRoleLabels, type WorkspaceRole } from './workspace-role-model';
export async function workspaceRole(userId: string, ownerId: string, admin = false): Promise<WorkspaceRole> {
  if (userId === ownerId || admin) return 'owner';
  const row = await getDb()
    .prepare('SELECT role FROM workspace_member_roles WHERE owner_id = ? AND user_id = ?')
    .get(ownerId, userId);
  return row && workspaceRoles.includes(row.role as (typeof workspaceRoles)[number])
    ? (row.role as WorkspaceRole)
    : 'editor';
}
export function assertWorkspaceRole(
  role: WorkspaceRole,
  write = false,
  area: 'data' | 'field' | 'shell' = 'data',
) {
  if (role === 'viewer' && write) throw new AppError('Akun Anda hanya dapat membaca workspace ini.', 403);
  if (role === 'coordinator' && area === 'data')
    throw new AppError('Koordinator dapat membuka Surveyor, Cleaning data, dan Operasi lapangan.', 403);
}
