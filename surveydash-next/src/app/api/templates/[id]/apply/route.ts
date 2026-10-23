import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { applyTemplate, getTemplate } from '@/lib/repository';
import { createFromSlideTemplate } from '@/lib/presentation-repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const input = z
      .object({
        surveyId: z.string().max(100),
        version: z.number().int().min(1),
        mapping: z.record(z.string().max(100), z.string().max(100)),
      })
      .parse(await readJson(request));
    const id = (await context.params).id;
    const template = await getTemplate(id, user.ownerId);
    return template.slidePreset
      ? createFromSlideTemplate(id, user.ownerId, input.surveyId, input.mapping)
      : applyTemplate(id, user.ownerId, input.surveyId, input.version, input.mapping);
  }, '/api/templates/[id]/apply');
}
