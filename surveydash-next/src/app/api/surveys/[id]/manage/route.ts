import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { manageSurvey } from '@/lib/repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const input = z
      .object({ action: z.enum(['duplicate', 'archive', 'unarchive', 'trash', 'restore', 'opened']) })
      .parse(await readJson(request));
    return manageSurvey((await context.params).id, user.ownerId, input.action);
  });
}
