import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { applyTemplate, getTemplate } from '@/lib/repository';
import { createFromSlideTemplate } from '@/lib/presentation-repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        surveyId: z.string().max(100),
        version: z.number().int().min(1),
        mapping: z.record(z.string().max(100), z.string().max(100)),
      })
      .parse(await readJson(request));
    const id = (await context.params).id;
    const template = await getTemplate(id, user.id);
    return template.slidePreset
      ? createFromSlideTemplate(id, user.id, input.surveyId, input.mapping)
      : applyTemplate(id, user.id, input.surveyId, input.version, input.mapping);
  });
}
