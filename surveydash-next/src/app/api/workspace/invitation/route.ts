import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import {
  getWorkspaceInvitation,
  createWorkspaceInvitation,
  revokeWorkspaceInvitation,
} from '@/lib/workspace-team';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    return { invitation: await getWorkspaceInvitation(user.ownerId, user.id) };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    z.object({})
      .strict()
      .parse(await readJson(request, 2000));
    return { invitation: await createWorkspaceInvitation(user.ownerId, user.id) };
  });
}
export async function DELETE(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    await revokeWorkspaceInvitation(user.ownerId, user.id);
    return { invitation: null };
  });
}
