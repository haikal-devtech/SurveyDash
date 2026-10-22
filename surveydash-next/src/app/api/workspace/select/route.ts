import { z } from 'zod';
import { api, checkOrigin, readJson, requireManagerUser } from '@/lib/http';
import { switchWorkspace } from '@/lib/workspace-session';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireManagerUser();
    const { ownerId } = z
      .object({ ownerId: z.string().min(1).max(100) })
      .strict()
      .parse(await readJson(request, 2000));
    return switchWorkspace(user.id, ownerId);
  });
}
