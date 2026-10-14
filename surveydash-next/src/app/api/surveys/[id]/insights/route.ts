import { api, requireWorkspaceUser } from '@/lib/http';
import { getSurveyInsights } from '@/lib/responses-repository';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const user = await requireWorkspaceUser();
    return getSurveyInsights(
      (await context.params).id,
      user.ownerId,
      new URL(request.url).searchParams.get('samples') === 'true',
    );
  });
}
