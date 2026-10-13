import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { saveSlideTemplate } from '@/lib/presentation-repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z.object({ name: z.string().trim().min(3).max(200) }).parse(await readJson(request));
    return saveSlideTemplate((await context.params).id, user.id, input.name);
  });
}
