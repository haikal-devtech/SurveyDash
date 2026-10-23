import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { crossTab, setResponseWeight } from '@/lib/research-repository';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const user = await requireWorkspaceUser();
    const parameters = new URL(request.url).searchParams;
    const row = z.string().min(1).max(100).parse(parameters.get('row')),
      column = z.string().min(1).max(100).parse(parameters.get('column'));
    return crossTab(
      (await context.params).id,
      user.ownerId,
      row,
      column,
      parameters.get('weighted') === 'true',
      Object.fromEntries(parameters),
      request.signal,
    );
  }, '/api/surveys/[id]/research');
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const input = z
      .object({
        submissionId: z.string().min(1).max(100),
        revision: z.number().int().min(1),
        weight: z.number().positive().max(1000),
        reason: z.string().trim().min(5).max(1000),
      })
      .parse(await readJson(request, 3000));
    return setResponseWeight((await context.params).id, user.ownerId, user.id, input);
  }, '/api/surveys/[id]/research');
}
