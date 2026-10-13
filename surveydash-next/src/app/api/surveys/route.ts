import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { createSurvey, ensureDemoWorkspace, listSurveys, listTemplates } from '@/lib/repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => {
    const user = await requireUser();
    await ensureDemoWorkspace(user.id);
    return { surveys: await listSurveys(user.id), templates: await listTemplates(user.id) };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ title: z.string().trim().min(3).max(200), templateId: z.string().max(100) })
      .parse(await readJson(request));
    return await createSurvey(user.id, input.title, input.templateId);
  });
}
