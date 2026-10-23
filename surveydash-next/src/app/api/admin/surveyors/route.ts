import { api, requireAdmin } from '@/lib/http';
import { listRegisteredSurveyors } from '@/lib/admin-surveyors';
import { getDb } from '@/lib/db';
export async function GET() {
  return api(async () => {
    const user = await requireAdmin();
    return {
      surveyors: await listRegisteredSurveyors(user.id),
      blockedSurveyors: (
        await getDb()
          .prepare("SELECT surveyor_id FROM surveyor_blocks WHERE owner_id = '*' AND active = 1")
          .all()
      ).map((row) => String(row.surveyor_id)),
    };
  }, '/api/admin/surveyors');
}
