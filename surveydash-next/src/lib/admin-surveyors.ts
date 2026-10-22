import { assertManager } from './account-repository';
import { isPlatformAdmin } from './access-repository';
import { getDb } from './db';
import { AppError } from './repository';
export interface RegisteredSurveyor {
  userId: string;
  username: string;
  fullName: string;
  provinceId: string | null;
}
export async function listRegisteredSurveyors(actor: string): Promise<RegisteredSurveyor[]> {
  await assertManager(actor);
  if (!(await isPlatformAdmin(actor))) throw new AppError('Akses admin diperlukan.', 403);
  const rows = await getDb()
    .prepare(
      `SELECT p.user_id, p.username, p.full_name, h.province_id FROM surveyor_profiles p
    JOIN "user" u ON u.id = p.user_id LEFT JOIN surveyor_home_provinces h ON h.user_id = p.user_id ORDER BY p.full_name, p.username`,
    )
    .all();
  return rows.map((row) => ({
    userId: String(row.user_id),
    username: String(row.username),
    fullName: String(row.full_name),
    provinceId: row.province_id ? String(row.province_id) : null,
  }));
}
