import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import {
  getPresentation,
  updatePresentation,
  managePresentation,
  refreshPresentation,
} from '@/lib/presentation-repository';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, context: Context) {
  return api(
    async () => getPresentation((await context.params).id, (await requireWorkspaceUser()).ownerId),
    '/api/presentations/[id]',
  );
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    return updatePresentation((await context.params).id, user.ownerId, await readJson(request, 2_000_000));
  }, '/api/presentations/[id]');
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const input = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('refresh'), version: z.number().int().min(1) }),
        z.object({
          action: z.enum(['duplicate', 'archive', 'unarchive']),
          title: z.string().trim().min(3).max(200).optional(),
        }),
      ])
      .parse(await readJson(request));
    const id = (await context.params).id;
    return input.action === 'refresh'
      ? refreshPresentation(id, user.ownerId, input.version)
      : managePresentation(id, user.ownerId, input.action, input.title);
  }, '/api/presentations/[id]');
}
