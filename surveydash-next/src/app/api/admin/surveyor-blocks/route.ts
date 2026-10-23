import { z } from 'zod';
import { api, checkOrigin, readJson, requireAdmin } from '@/lib/http';
import { setSurveyorBlock } from '@/lib/surveyor-blocks';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireAdmin();
    const input = z
      .object({
        surveyorId: z.string().min(1).max(100),
        active: z.boolean(),
        reason: z.string().trim().min(5).max(1000),
      })
      .parse(await readJson(request, 3000));
    return setSurveyorBlock('*', input.surveyorId, input.active, input.reason, user.id);
  }, '/api/admin/surveyor-blocks');
}
