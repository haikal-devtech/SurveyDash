import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import {
  exportFrozenCsv,
  freezeDataset,
  listDatasetVersions,
  frozenDatasetSummary,
} from '@/lib/dataset-repository';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  let download: Response | undefined;
  const result = await api(async () => {
    const user = await requireWorkspaceUser(),
      surveyId = (await context.params).id;
    const params = new URL(request.url).searchParams;
    if (params.get('format') === 'summary')
      return frozenDatasetSummary(
        surveyId,
        user.ownerId,
        z.string().uuid().parse(params.get('version')),
        request.signal,
      );
    if (params.get('format') === 'csv') {
      download = await exportFrozenCsv(
        surveyId,
        user.ownerId,
        z.string().uuid().parse(params.get('version')),
        request.signal,
      );
      return null;
    }
    return { versions: await listDatasetVersions(surveyId, user.ownerId) };
  }, '/api/surveys/[id]/datasets');
  return download ?? result;
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser({ write: true });
    const input = z
      .object({
        name: z.string().trim().min(3).max(100),
        dataset: z.enum(['all', 'accepted']),
        methodNotes: z.string().trim().min(10).max(4000),
        acknowledged: z.literal(true),
      })
      .parse(await readJson(request, 6000));
    return freezeDataset((await context.params).id, user.ownerId, user.id, input);
  }, '/api/surveys/[id]/datasets');
}
