import { api, checkOrigin, requireSurveyorUser } from '@/lib/http';
import { acceptSurveyorInvitation } from '@/lib/surveyor-invitations';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireSurveyorUser();
    return acceptSurveyorInvitation((await params).token, user.id);
  }, '/api/surveyor/invitations/[token]/accept');
}
