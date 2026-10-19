import { z } from 'zod';
import { getDb } from './db';
import { getAccountRole } from './account-repository';
import { GUIDE_VERSION } from './guides';

export const guideResultSchema = z.object({ status: z.enum(['completed', 'skipped']) }).strict();

export async function getGuideState(userId: string) {
  const role = await getAccountRole(userId);
  const row = await getDb()
    .prepare('SELECT status FROM account_guides WHERE user_id = ? AND role = ? AND version = ?')
    .get(userId, role, GUIDE_VERSION);
  return { role, version: GUIDE_VERSION, status: row?.status ?? 'new' };
}

export async function saveGuideResult(userId: string, input: unknown) {
  const { status } = guideResultSchema.parse(input);
  const role = await getAccountRole(userId);
  await getDb()
    .prepare(
      `INSERT INTO account_guides (user_id, role, version, status, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, role, version) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    )
    .run(userId, role, GUIDE_VERSION, status, new Date().toISOString());
  return { role, version: GUIDE_VERSION, status };
}
