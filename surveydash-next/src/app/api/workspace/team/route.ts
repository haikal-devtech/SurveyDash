import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { listWorkspaceMembers, setWorkspaceMemberActive } from '@/lib/workspace-team';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    return { members: await listWorkspaceMembers(user.ownerId, user.id) };
  });
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const body = z
      .object({ userId: z.string().min(1).max(100), active: z.boolean() })
      .strict()
      .parse(await readJson(request, 2000));
    return { members: await setWorkspaceMemberActive(user.ownerId, user.id, body.userId, body.active) };
  });
}
