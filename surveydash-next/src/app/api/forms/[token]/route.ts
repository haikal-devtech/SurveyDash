import { createHash } from 'node:crypto';
import { z } from 'zod';
import { api, checkOrigin, readJson } from '@/lib/http';
import { allowSubmission, AppError, getSurveyByToken, submitResponse } from '@/lib/repository';
import { canAccessForm } from '@/lib/model';
type Context = { params: Promise<{ token: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const { token } = await context.params;
    const survey = await getSurveyByToken(token);
    if (!canAccessForm(survey)) throw new AppError('Form tidak tersedia.', 404);
    return {
      title: survey.title,
      description: survey.description,
      institution: survey.institution,
      status: survey.status,
      questions: survey.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      })),
      demo: survey.demo,
    };
  }, '/api/forms/[token]');
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    checkOrigin(request);
    const { token } = await context.params;
    // Only trust forwarded headers when deployed behind an explicitly configured proxy.
    const ip =
      process.env.TRUST_PROXY === 'true'
        ? (request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local')
        : 'local';
    const key = createHash('sha256')
      .update(token + ':' + ip)
      .digest('hex');
    if (!(await allowSubmission(key)))
      throw new AppError('Terlalu banyak pengiriman. Coba lagi dalam satu menit.', 429);
    const input = z
      .object({
        answers: z.unknown(),
        requestKey: z.string().uuid(),
        startedAt: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(await readJson(request));
    return await submitResponse(token, input.answers, input.requestKey, undefined, input.startedAt);
  }, '/api/forms/[token]');
}
