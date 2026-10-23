import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { getUsage, getWorkspace, saveWorkspace } from '@/lib/workspace-repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    const [workspace, usage] = await Promise.all([getWorkspace(user.ownerId), getUsage(user.ownerId)]);
    return { workspace, usage, access: { isAdmin: user.isAdmin, managingOther: user.managingOther } };
  }, '/api/workspace');
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    return saveWorkspace((await requireWorkspaceUser({ write: true })).ownerId, await readJson(request));
  }, '/api/workspace');
}
