import { api, requireAdmin } from '@/lib/http';
import { listRegisteredSurveyors } from '@/lib/admin-surveyors';
export async function GET() {
  return api(async () => ({ surveyors: await listRegisteredSurveyors((await requireAdmin()).id) }));
}
