import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { saveSlideTemplate } from '@/lib/presentation-repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const input = z.object({ name: z.string().trim().min(3).max(200) }).parse(await readJson(request));
    return saveSlideTemplate((await context.params).id, user.ownerId, input.name);
  });
}
