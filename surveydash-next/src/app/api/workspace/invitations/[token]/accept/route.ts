import { api, checkOrigin, requireManagerUser } from '@/lib/http';
import { acceptWorkspaceInvitation } from '@/lib/workspace-team';
import { switchWorkspace } from '@/lib/workspace-session';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireManagerUser();
    const result = await acceptWorkspaceInvitation((await params).token, user.id);
    return switchWorkspace(user.id, result.ownerId);
  }, '/api/workspace/invitations/[token]/accept');
}
