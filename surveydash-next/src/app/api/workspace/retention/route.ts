import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { retentionOverview, saveRetention, purgeTrashedSurvey } from '@/lib/data-governance';
import { canManageWorkspaceTeam } from '@/lib/workspace-team';
import { AppError } from '@/lib/repository';
export async function GET() {
  return api(async () => {
    const user = await requireWorkspaceUser();
    if (!(await canManageWorkspaceTeam(user.id, user.ownerId)))
      throw new AppError('Akses pemilik diperlukan.', 403);
    return retentionOverview(user.ownerId);
  }, '/api/workspace/retention');
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    if (!(await canManageWorkspaceTeam(user.id, user.ownerId)))
      throw new AppError('Akses pemilik diperlukan.', 403);
    const input = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('policy'), days: z.number().int().min(30).max(3650) }),
        z.object({
          action: z.literal('purge'),
          surveyId: z.string().min(1).max(100),
          title: z.string().min(3).max(200),
          backupAcknowledged: z.literal(true),
          reason: z.string().trim().min(10).max(1000),
        }),
      ])
      .parse(await readJson(request, 4000));
    if (input.action === 'policy') await saveRetention(user.ownerId, user.id, input.days);
    else
      await purgeTrashedSurvey(
        user.ownerId,
        user.id,
        input.surveyId,
        input.title,
        input.backupAcknowledged,
        input.reason,
      );
    return retentionOverview(user.ownerId);
  }, '/api/workspace/retention');
}
