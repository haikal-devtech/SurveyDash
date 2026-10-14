import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { getShareStatus, publishPresentation, revokePresentation } from '@/lib/share-repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api(async () => getShareStatus((await context.params).id, (await requireWorkspaceUser()).ownerId));
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const input = z
      .object({ version: z.number().int().min(1), acknowledge: z.boolean() })
      .parse(await readJson(request));
    return publishPresentation((await context.params).id, user.ownerId, input.version, input.acknowledge);
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    return revokePresentation((await context.params).id, (await requireWorkspaceUser()).ownerId);
  });
}
