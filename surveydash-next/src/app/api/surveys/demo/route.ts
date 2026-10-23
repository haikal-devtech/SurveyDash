import { api, checkOrigin, requireWorkspaceUser } from '@/lib/http';
import { ensureDemoWorkspace, listSurveys } from '@/lib/repository';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    await ensureDemoWorkspace(user.ownerId);
    return listSurveys(user.ownerId);
  }, '/api/surveys/demo');
}
