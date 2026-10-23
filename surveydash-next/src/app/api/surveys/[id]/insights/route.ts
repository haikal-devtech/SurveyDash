import { api, requireWorkspaceUser } from '@/lib/http';
import { getSurveyInsights, getQuestionBreakdown } from '@/lib/responses-repository';
import { z } from 'zod';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const user = await requireWorkspaceUser();
    const questionId = new URL(request.url).searchParams.get('questionId');
    if (questionId !== null)
      return getQuestionBreakdown(
        (await context.params).id,
        user.ownerId,
        z.string().min(1).max(100).parse(questionId),
      );
    return getSurveyInsights(
      (await context.params).id,
      user.ownerId,
      new URL(request.url).searchParams.get('samples') === 'true',
      z
        .enum(['all', 'accepted'])
        .optional()
        .parse(new URL(request.url).searchParams.get('dataset') ?? undefined),
    );
  }, '/api/surveys/[id]/insights');
}
