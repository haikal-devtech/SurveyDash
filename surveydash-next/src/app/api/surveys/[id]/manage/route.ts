import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { manageSurvey } from '@/lib/repository';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ action: z.enum(['duplicate', 'archive', 'unarchive', 'trash', 'restore', 'opened']) })
      .parse(await readJson(request));
    return manageSurvey((await context.params).id, user.id, input.action);
  });
}
