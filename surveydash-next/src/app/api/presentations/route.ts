import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { createPresentation, listPresentations } from '@/lib/presentation-repository';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const surveyId = z.string().min(1).max(100).parse(new URL(request.url).searchParams.get('surveyId'));
    return listPresentations(surveyId, user.id);
  });
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        surveyId: z.string().max(100),
        title: z.string().trim().min(3).max(200),
        theme: z.enum(['professional', 'minimal', 'corporate']).default('professional'),
        sections: z
          .array(z.enum(['cover', 'summary', 'demographic', 'ikm', 'charts', 'conclusion']))
          .max(6)
          .default([]),
      })
      .parse(await readJson(request));
    return createPresentation(input.surveyId, user.id, input.title, input.theme, [
      ...new Set(input.sections),
    ]);
  });
}
