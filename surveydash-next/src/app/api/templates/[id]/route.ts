import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { duplicateTemplate, getTemplate, updateTemplate } from '@/lib/repository';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, context: Context) {
  return api(async () => getTemplate((await context.params).id, (await requireUser()).id));
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        name: z.string().trim().min(3).max(200).optional(),
        description: z.string().trim().max(1000).optional(),
        archived: z.boolean().optional(),
      })
      .parse(await readJson(request));
    return updateTemplate((await context.params).id, user.id, input);
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ action: z.literal('duplicate'), name: z.string().trim().min(3).max(200) })
      .parse(await readJson(request));
    return duplicateTemplate((await context.params).id, user.id, input.name);
  });
}
