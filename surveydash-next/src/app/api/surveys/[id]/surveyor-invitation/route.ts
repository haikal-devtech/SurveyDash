import { api, checkOrigin, requireWorkspaceUser } from '@/lib/http';
import { createSurveyorInvitation, getManagedInvitation, revokeSurveyorInvitation } from '@/lib/surveyor-invitations';

type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: Context) {
  return api(async () => ({ invitation: await getManagedInvitation((await params).id, (await requireWorkspaceUser()).ownerId) }));
}
export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    return { invitation: await createSurveyorInvitation((await params).id, user.ownerId, user.id) };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    await revokeSurveyorInvitation((await params).id, user.ownerId);
    return { invitation: null };
  });
}
