import { z } from 'zod';
import { getDb } from './db';
import { listSurveys } from './repository';
import { configuredLimits, type PlanUsage } from './plans';
export async function getUsage(ownerId: string): Promise<PlanUsage> {
  const date = new Date();
  const localMonth = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const start = new Date(
    Date.UTC(localMonth.getUTCFullYear(), localMonth.getUTCMonth(), 1) - 7 * 60 * 60 * 1000,
  ).toISOString();
  const surveys = await listSurveys(ownerId, true);
  const row = await getDb()
    .prepare(
      'SELECT count(*) AS total FROM submissions JOIN surveys ON submissions.survey_id = surveys.id WHERE surveys.owner_id = ? AND submitted_at >= ?',
    )
    .get(ownerId, start);
  return {
    responses: Number(row?.total ?? 0),
    activeSurveys: surveys.filter((s) => s.status === 'open' && !s.archivedAt && !s.deletedAt).length,
    totalSurveys: surveys.filter((s) => !s.deletedAt).length,
    simulatedResponses: surveys.filter((s) => s.demo).reduce((total, s) => total + (s.responseCount ?? 0), 0),
    period: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }),
    ...configuredLimits(),
  };
}
export const workspaceSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500),
  locale: z.literal('id-ID').default('id-ID'),
});
export async function getWorkspace(ownerId: string) {
  const row = await getDb().prepare('SELECT payload FROM workspace_settings WHERE owner_id = ?').get(ownerId);
  return row
    ? workspaceSchema.parse(JSON.parse(String(row.payload)))
    : { name: 'Workspace survei', description: 'Ruang kerja pribadi', locale: 'id-ID' as const };
}
export async function saveWorkspace(ownerId: string, input: unknown) {
  const payload = workspaceSchema.parse(input);
  await getDb()
    .prepare(
      'INSERT INTO workspace_settings(owner_id, payload) VALUES (?, ?) ON CONFLICT(owner_id) DO UPDATE SET payload = excluded.payload',
    )
    .run(ownerId, JSON.stringify(payload));
  return payload;
}
