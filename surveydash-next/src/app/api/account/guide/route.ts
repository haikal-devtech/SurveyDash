import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { getGuideState, saveGuideResult } from '@/lib/guide-repository';

export async function GET() {
  return api(async () => getGuideState((await requireUser()).id), '/api/account/guide');
}

export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    return saveGuideResult(user.id, await readJson(request, 1000));
  }, '/api/account/guide');
}
