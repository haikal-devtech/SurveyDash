import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { createSurvey, listSurveys, listTemplates } from '@/lib/repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    return { surveys: await listSurveys(user.ownerId), templates: await listTemplates(user.ownerId) };
  }, '/api/surveys');
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const input = z
      .object({ title: z.string().trim().min(3).max(200), templateId: z.string().max(100) })
      .parse(await readJson(request));
    return await createSurvey(user.ownerId, input.title, input.templateId);
  }, '/api/surveys');
}
