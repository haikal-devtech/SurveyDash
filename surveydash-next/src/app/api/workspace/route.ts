import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { getUsage, getWorkspace, saveWorkspace } from '@/lib/workspace-repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireUser();
    const [workspace, usage] = await Promise.all([getWorkspace(user.id), getUsage(user.id)]);
    return { workspace, usage };
  });
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    return saveWorkspace((await requireUser()).id, await readJson(request));
  });
}
