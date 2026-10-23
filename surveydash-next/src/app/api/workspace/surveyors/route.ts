import { api, requireWorkspaceUser } from '@/lib/http';
import { listWorkspaceSurveyors } from '@/lib/surveyor-repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(
    async () => ({
      surveys: await listWorkspaceSurveyors((await requireWorkspaceUser({ area: 'field' })).ownerId),
    }),
    '/api/workspace/surveyors',
  );
}
