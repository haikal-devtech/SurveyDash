import { z } from 'zod';
import { api, checkOrigin, readJson, requireAdmin } from '@/lib/http';
import { listDataRequests, reviewDataRequest } from '@/lib/data-governance';
export async function GET() {
  return api(async () => {
    await requireAdmin();
    return listDataRequests();
  }, '/api/admin/data-requests');
}
export async function PATCH(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireAdmin();
    const input = z
      .object({
        id: z.string().uuid(),
        status: z.enum(['reviewing', 'completed', 'declined']),
        note: z.string().trim().min(10).max(2000),
      })
      .parse(await readJson(request, 4000));
    await reviewDataRequest(input.id, user.id, input.status, input.note);
    return { saved: true };
  }, '/api/admin/data-requests');
}
