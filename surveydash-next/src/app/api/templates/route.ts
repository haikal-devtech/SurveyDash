import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { getSurvey, listTemplates, saveTemplate } from '@/lib/repository';
import { surveyInputSchema } from '@/lib/model';
import { systemTemplates, templateMetadataSchema } from '@/lib/template-model';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const templates = await listTemplates(user.id, new URL(request.url).searchParams.get('archived') === 'include');
    return { templates: [...systemTemplates, ...templates] };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = templateMetadataSchema.extend({ surveyId: z.string().max(100), snapshot: z.unknown().optional() }).parse(await readJson(request));
    const source = await getSurvey(input.surveyId, user.id);
    const snapshot = input.snapshot === undefined ? source : { ...source, ...surveyInputSchema.parse(input.snapshot) };
    return saveTemplate(snapshot, input.name, input.category, input.description);
  });
}
