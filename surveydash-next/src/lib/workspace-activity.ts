import { randomUUID } from 'node:crypto';
import { getDb } from './db';
export async function recordActivity(
  ownerId: string,
  actor: string,
  action: string,
  subject: string,
  details: Record<string, unknown> = {},
) {
  await getDb()
    .prepare('INSERT INTO workspace_activity VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), ownerId, actor, action, subject, JSON.stringify(details), new Date().toISOString());
}
export async function workspaceActivity(ownerId: string) {
  return getDb()
    .prepare(
      'SELECT a.id, a.actor, u.name AS actor_name, a.action, a.subject_id, a.details, a.at FROM workspace_activity a LEFT JOIN "user" u ON u.id = a.actor WHERE a.owner_id = ? ORDER BY a.at DESC, a.id LIMIT 100',
    )
    .all(ownerId);
}
