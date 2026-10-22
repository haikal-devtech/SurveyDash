import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { isProvinceId } from '@/lib/provinces';
import { listProvinceTargets, setProvinceTarget } from '@/lib/surveyor-repository';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return api(async () => ({
    targets: await listProvinceTargets((await params).id, (await requireWorkspaceUser()).ownerId),
  }));
}
export async function PATCH(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const body = z
      .object({
        provinceId: z.string().max(70).refine(isProvinceId),
        target: z.number().int().min(1).max(10000000).nullable(),
      })
      .strict()
      .parse(await readJson(request, 2000));
    return {
      targets: await setProvinceTarget(
        (await params).id,
        user.ownerId,
        body.provinceId,
        body.target,
        user.id,
      ),
    };
  });
}
