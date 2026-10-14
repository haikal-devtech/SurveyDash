import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import {
  getSurvey,
  listSubmissions,
  listAudit,
  updateSurvey,
  saveTemplate,
  editAnswer,
} from '@/lib/repository';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const user = await requireWorkspaceUser();
    const { id } = await context.params;
    return {
      survey: await getSurvey(id, user.ownerId),
      submissions: await listSubmissions(id),
      audit: await listAudit(id),
    };
  });
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const { id } = await context.params;
    return await updateSurvey(id, user.ownerId, await readJson(request));
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const { id } = await context.params;
    const input = z
      .object({ action: z.literal('template'), name: z.string().trim().min(3).max(200) })
      .parse(await readJson(request));
    return await saveTemplate(await getSurvey(id, user.ownerId), input.name);
  });
}
export async function PUT(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const { id } = await context.params;
    const input = z
      .object({
        submissionId: z.string().max(100),
        questionId: z.string().max(100),
        value: z.union([z.string().max(10000), z.number().finite(), z.array(z.string().max(100)).max(50)]),
        revision: z.number().int().min(1),
      })
      .parse(await readJson(request));
    return await editAnswer(
      id,
      user.ownerId,
      input.submissionId,
      input.questionId,
      input.value,
      input.revision,
      user.id,
    );
  });
}
