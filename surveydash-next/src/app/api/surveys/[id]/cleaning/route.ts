import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { getCleaningPage, reviewCleaningSubmission, saveCleaningConfig } from '@/lib/cleaning-repository';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const user = await requireWorkspaceUser({ area: 'field' });
    const { id } = await context.params;
    return getCleaningPage(id, user.ownerId, Object.fromEntries(new URL(request.url).searchParams));
  }, '/api/surveys/[id]/cleaning');
}
export async function PUT(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true, area: 'field' });
    const { id } = await context.params;
    return saveCleaningConfig(id, user.ownerId, await readJson(request, 10000));
  }, '/api/surveys/[id]/cleaning');
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true, area: 'field' });
    const { id } = await context.params;
    return reviewCleaningSubmission(id, user.ownerId, user.id, await readJson(request, 10000));
  }, '/api/surveys/[id]/cleaning');
}
