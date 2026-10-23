import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { fieldworkOverview, saveFieldwork, savePayment } from '@/lib/fieldwork-repository';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser({ area: 'field' });
    return fieldworkOverview(user.ownerId, ['owner', 'editor'].includes(user.workspaceRole));
  }, '/api/workspace/fieldwork');
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true, area: 'field' });
    const body = z
      .object({
        assignmentId: z.string().min(1).max(100),
        coordinatorId: z.string().max(100).nullable().optional(),
        city: z.string().trim().max(100),
        district: z.string().trim().max(100),
        target: z.number().int().min(1).max(10000000).nullable(),
      })
      .parse(await readJson(request, 3000));
    await saveFieldwork(user.ownerId, user.id, body);
    return fieldworkOverview(user.ownerId, ['owner', 'editor'].includes(user.workspaceRole));
  }, '/api/workspace/fieldwork');
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const body = z
      .object({
        assignmentId: z.string().min(1).max(100),
        amount: z.number().int().min(0).max(10000000000),
        status: z.enum(['pending', 'paid']),
        note: z.string().trim().min(3).max(1000),
      })
      .parse(await readJson(request, 3000));
    await savePayment(user.ownerId, user.id, body);
    return fieldworkOverview(user.ownerId);
  }, '/api/workspace/fieldwork');
}
