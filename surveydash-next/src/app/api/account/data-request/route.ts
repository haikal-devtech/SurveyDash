import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { createDataRequest, listDataRequests } from '@/lib/data-governance';
export async function GET() {
  return api(async () => listDataRequests((await requireUser()).id), '/api/account/data-request');
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({
        kind: z.enum(['access', 'correction', 'deletion', 'withdrawal']),
        note: z.string().trim().min(10).max(2000),
      })
      .parse(await readJson(request, 4000));
    return createDataRequest(user.id, input.kind, input.note);
  }, '/api/account/data-request');
}
