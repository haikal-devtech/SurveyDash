import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { listWorkspaceMembers, setWorkspaceMemberActive, setWorkspaceMemberRole } from '@/lib/workspace-team';
import { workspaceRoles } from '@/lib/workspace-roles';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    return { members: await listWorkspaceMembers(user.ownerId, user.id) };
  }, '/api/workspace/team');
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const body = z
      .object({
        userId: z.string().min(1).max(100),
        active: z.boolean().optional(),
        role: z.enum(workspaceRoles).optional(),
      })
      .strict()
      .refine(
        (body) => (body.active !== undefined) !== (body.role !== undefined),
        'Pilih satu perubahan anggota.',
      )
      .parse(await readJson(request, 2000));
    return {
      members:
        body.role !== undefined
          ? await setWorkspaceMemberRole(user.ownerId, user.id, body.userId, body.role)
          : await setWorkspaceMemberActive(user.ownerId, user.id, body.userId, body.active!),
    };
  }, '/api/workspace/team');
}
