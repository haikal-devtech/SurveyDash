import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { assignSurveyor, listManagedSurveyors, setAssignmentActive } from '@/lib/surveyor-repository';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return api(async () => ({
    assignments: await listManagedSurveyors((await params).id, (await requireWorkspaceUser()).ownerId),
  }));
}
export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const body = z.object({ username: z.string().max(30) }).parse(await readJson(request, 2000));
    return { assignments: await assignSurveyor((await params).id, user.ownerId, body.username, user.id) };
  });
}
export async function PATCH(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const body = z
      .object({ assignmentId: z.string().uuid(), active: z.boolean() })
      .parse(await readJson(request, 2000));
    return {
      assignments: await setAssignmentActive(
        (await params).id,
        user.ownerId,
        body.assignmentId,
        body.active,
        user.id,
      ),
    };
  });
}
