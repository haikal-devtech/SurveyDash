import { z } from 'zod';
import { api, checkOrigin, readJson, requireAdmin, requireUser } from '@/lib/http';
import { listAdminWorkspaces } from '@/lib/access-repository';
import { switchWorkspace } from '@/lib/workspace-session';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => listAdminWorkspaces((await requireAdmin()).id));
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const { ownerId } = z.object({ ownerId: z.string().min(1).max(100) }).parse(await readJson(request));
    return switchWorkspace(user.id, ownerId);
  });
}
