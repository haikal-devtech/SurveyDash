import { api, checkOrigin, requireWorkspaceUser } from '@/lib/http';
import {
  createSurveyorInvitation,
  getManagedInvitation,
  revokeSurveyorInvitation,
} from '@/lib/surveyor-invitations';

type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: Context) {
  return api(
    async () => ({
      invitation: await getManagedInvitation(
        (await params).id,
        (await requireWorkspaceUser({ area: 'field' })).ownerId,
      ),
    }),
    '/api/surveys/[id]/surveyor-invitation',
  );
}
export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true, area: 'field' });
    return { invitation: await createSurveyorInvitation((await params).id, user.ownerId, user.id) };
  }, '/api/surveys/[id]/surveyor-invitation');
}
export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true, area: 'field' });
    await revokeSurveyorInvitation((await params).id, user.ownerId, user.id);
    return { invitation: null };
  }, '/api/surveys/[id]/surveyor-invitation');
}
