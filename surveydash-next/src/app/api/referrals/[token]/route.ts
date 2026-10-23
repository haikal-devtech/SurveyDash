import { createHash } from 'node:crypto';
import { z } from 'zod';
import { api, checkOrigin, readJson } from '@/lib/http';
import { resolveReferral } from '@/lib/surveyor-repository';
import { allowSubmission, AppError, submitResponse } from '@/lib/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ token: string }> };
export async function POST(request: Request, { params }: Context) {
  return api(async () => {
    checkOrigin(request);
    const { token } = await params;
    const source = await resolveReferral(token);
    const ip =
      process.env.TRUST_PROXY === 'true'
        ? (request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local')
        : 'local';
    const key = createHash('sha256')
      .update(source.survey.token + ':' + ip)
      .digest('hex');
    if (!(await allowSubmission(key)))
      throw new AppError('Terlalu banyak pengiriman. Coba lagi dalam satu menit.', 429);
    const body = z
      .object({
        answers: z.unknown(),
        requestKey: z.string().uuid(),
        startedAt: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(await readJson(request));
    return submitResponse(source.survey.token, body.answers, body.requestKey, token, body.startedAt);
  }, '/api/referrals/[token]');
}
