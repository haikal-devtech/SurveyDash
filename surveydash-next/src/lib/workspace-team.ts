import { randomBytes } from 'node:crypto';
import { getDb } from './db';
import { assertManager } from './account-repository';
import { isPlatformAdmin } from './access-repository';
import { AppError } from './repository';
import { getWorkspace } from './workspace-repository';
import { authBaseUrl } from './origins';
import { workspaceRoles, type WorkspaceRole } from './workspace-roles';
import { recordActivity } from './workspace-activity';
import type { WorkspaceChoice, WorkspaceMember, WorkspaceInvitation } from './workspace-types';

type Row = Record<string, string | number | null>;
const unavailable = () =>
  new AppError('Undangan tidak berlaku. Minta link baru kepada pemilik workspace.', 404);
const valid = (row: Row | undefined): row is Row =>
  !!row && Number(row.active) === 1 && Date.parse(String(row.expires_at)) > Date.now();
const invitation = (row: Row): WorkspaceInvitation => ({
  url: new URL('/invite/workspace/' + String(row.token), authBaseUrl()).toString(),
  expiresAt: String(row.expires_at),
});

export async function canManageWorkspaceTeam(userId: string, ownerId: string) {
  await assertManager(userId);
  return userId === ownerId || (await isPlatformAdmin(userId));
}
async function requireOwner(ownerId: string, actor: string) {
  if (!(await canManageWorkspaceTeam(actor, ownerId)))
    throw new AppError('Hanya pemilik workspace yang dapat mengatur anggota dan undangan.', 403);
  if (!(await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(ownerId)))
    throw new AppError('Workspace tidak ditemukan.', 404);
  await assertManager(ownerId);
}
export async function listAvailableWorkspaces(userId: string): Promise<WorkspaceChoice[]> {
  await assertManager(userId);
  const rows = await getDb()
    .prepare(
      `SELECT u.id, u.name, w.payload FROM "user" u LEFT JOIN workspace_settings w ON w.owner_id = u.id
    WHERE (u.id = ? OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.owner_id = u.id AND m.user_id = ? AND m.active = 1))
    AND NOT EXISTS (SELECT 1 FROM surveyor_profiles p WHERE p.user_id = u.id) ORDER BY u.name`,
    )
    .all(userId, userId);
  return rows.map((row) => ({
    ownerId: String(row.id),
    ownerName: String(row.name),
    own: String(row.id) === userId,
    name: row.payload ? String(JSON.parse(String(row.payload)).name) : 'Workspace survei',
  }));
}
export async function listWorkspaceMembers(ownerId: string, actor: string): Promise<WorkspaceMember[]> {
  await requireOwner(ownerId, actor);
  const rows = await getDb()
    .prepare(
      'SELECT m.user_id, m.active, u.name, u.email, r.role FROM workspace_members m JOIN "user" u ON u.id = m.user_id LEFT JOIN workspace_member_roles r ON r.owner_id = m.owner_id AND r.user_id = m.user_id WHERE m.owner_id = ? ORDER BY m.created_at',
    )
    .all(ownerId);
  return rows.map((row) => ({
    userId: String(row.user_id),
    role: (row.role ?? 'editor') as WorkspaceRole,
    name: String(row.name),
    email: String(row.email),
    active: Number(row.active) === 1,
  }));
}
export async function setWorkspaceMemberRole(
  ownerId: string,
  actor: string,
  userId: string,
  role: (typeof workspaceRoles)[number],
) {
  return getDb().transaction(async () => {
    await getDb().lockOwner(ownerId);
    await requireOwner(ownerId, actor);
    if (
      !workspaceRoles.includes(role) ||
      !(await getDb()
        .prepare('SELECT user_id FROM workspace_members WHERE owner_id = ? AND user_id = ?')
        .get(ownerId, userId))
    )
      throw new AppError('Anggota atau peran tidak tersedia.', 404);
    await getDb()
      .prepare(
        `INSERT INTO workspace_member_roles VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, user_id) DO UPDATE SET role = excluded.role, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .run(ownerId, userId, role, actor, new Date().toISOString());
    await recordActivity(ownerId, actor, 'member.role', userId, { role });
    return listWorkspaceMembers(ownerId, actor);
  });
}
export async function getWorkspaceInvitation(ownerId: string, actor: string) {
  await requireOwner(ownerId, actor);
  const row = await getDb().prepare('SELECT * FROM workspace_invitations WHERE owner_id = ?').get(ownerId);
  return valid(row) ? invitation(row) : null;
}
export async function createWorkspaceInvitation(ownerId: string, actor: string) {
  return getDb().transaction(async () => {
    await getDb().lockOwner(ownerId);
    await requireOwner(ownerId, actor);
    const current = await getDb()
      .prepare('SELECT * FROM workspace_invitations WHERE owner_id = ?')
      .get(ownerId);
    if (valid(current)) return invitation(current);
    const at = new Date().toISOString(),
      expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const token = randomBytes(24).toString('base64url');
    await getDb()
      .prepare(
        `INSERT INTO workspace_invitations (owner_id, token, active, created_by, expires_at, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET token = excluded.token, active = 1,
      created_by = excluded.created_by, expires_at = excluded.expires_at, updated_at = excluded.updated_at`,
      )
      .run(ownerId, token, actor, expiresAt, at, at);
    await recordActivity(ownerId, actor, 'workspace.invitation.created', ownerId, { expiresAt });
    return invitation({ token, expires_at: expiresAt });
  });
}
export async function revokeWorkspaceInvitation(ownerId: string, actor: string) {
  await getDb().transaction(async () => {
    await getDb().lockOwner(ownerId);
    await requireOwner(ownerId, actor);
    await getDb()
      .prepare('UPDATE workspace_invitations SET active = 0, updated_at = ? WHERE owner_id = ?')
      .run(new Date().toISOString(), ownerId);
    await recordActivity(ownerId, actor, 'workspace.invitation.revoked', ownerId);
  });
}
async function invitationRow(token: string, lock = false) {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) throw unavailable();
  let row = await getDb().prepare('SELECT * FROM workspace_invitations WHERE token = ?').get(token);
  if (!valid(row)) throw unavailable();
  if (lock) {
    await getDb().lockOwner(String(row.owner_id));
    row = await getDb().prepare('SELECT * FROM workspace_invitations WHERE token = ?').get(token);
    if (!valid(row)) throw unavailable();
  }
  const owner = await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(row.owner_id);
  if (!owner) throw unavailable();
  await assertManager(String(row.owner_id));
  return row;
}
export async function resolveWorkspaceInvitation(token: string) {
  const row = await invitationRow(token);
  return { name: (await getWorkspace(String(row.owner_id))).name, expiresAt: String(row.expires_at) };
}
export async function acceptWorkspaceInvitation(token: string, userId: string) {
  return getDb().transaction(async () => {
    await assertManager(userId);
    if (!(await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(userId)))
      throw new AppError('Masuk sebagai Pengelola Survei terlebih dahulu.', 403);
    const row = await invitationRow(token, true),
      ownerId = String(row.owner_id);
    if (ownerId === userId) return { ownerId };
    const current = await getDb()
      .prepare('SELECT active FROM workspace_members WHERE owner_id = ? AND user_id = ?')
      .get(ownerId, userId);
    if (current && Number(current.active) !== 1)
      throw new AppError('Akses Anda telah dicabut. Hubungi pemilik workspace.', 403);
    if (!current) {
      const at = new Date().toISOString();
      await getDb()
        .prepare(
          'INSERT INTO workspace_members (owner_id, user_id, active, invited_by, updated_by, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?)',
        )
        .run(ownerId, userId, row.created_by, userId, at, at);
      await recordActivity(ownerId, userId, 'workspace.invitation.accepted', userId);
    }
    return { ownerId };
  });
}
export async function setWorkspaceMemberActive(
  ownerId: string,
  actor: string,
  userId: string,
  active: boolean,
) {
  return getDb().transaction(async () => {
    await getDb().lockOwner(ownerId);
    await requireOwner(ownerId, actor);
    const current = await getDb()
      .prepare('SELECT user_id FROM workspace_members WHERE owner_id = ? AND user_id = ?')
      .get(ownerId, userId);
    if (!current) throw new AppError('Anggota tidak ditemukan.', 404);
    await getDb()
      .prepare(
        'UPDATE workspace_members SET active = ?, updated_by = ?, updated_at = ? WHERE owner_id = ? AND user_id = ?',
      )
      .run(active ? 1 : 0, actor, new Date().toISOString(), ownerId, userId);
    await recordActivity(ownerId, actor, active ? 'member.activated' : 'member.revoked', userId);
    return listWorkspaceMembers(ownerId, actor);
  });
}
