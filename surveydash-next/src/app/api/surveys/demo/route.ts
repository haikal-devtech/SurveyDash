import { api, checkOrigin, requireUser } from '@/lib/http';
import { ensureDemoWorkspace, listSurveys } from '@/lib/repository';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    await ensureDemoWorkspace(user.id);
    return listSurveys(user.id);
  });
}
