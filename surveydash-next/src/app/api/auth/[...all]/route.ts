import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { api, checkOrigin, readJson } from '@/lib/http';
import { surveyorRegistration, discardUncreatedProfile } from '@/lib/account-repository';
import { surveyorProfileSchema } from '@/lib/surveyor-profile';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { createHash } from 'node:crypto';
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith('/sign-in/email')) {
    let signedIn: Response | undefined;
    const failure = await api(async () => {
      const body = z.record(z.string(), z.unknown()).parse(await readJson(request.clone(), 20000));
      if (body.accountRole === 'surveyor' && typeof body.email === 'string' && !body.email.includes('@')) {
        checkOrigin(request);
        const username = z.string().trim().toLowerCase().min(3).max(30).parse(body.email);
        const profile = await getDb()
          .prepare(
            'SELECT u.email FROM "user" u JOIN surveyor_profiles p ON p.user_id = u.id WHERE p.username = ?',
          )
          .get(username);
        const email = profile
          ? String(profile.email)
          : 'unknown-' + createHash('sha256').update(username).digest('hex') + '@surveydash.invalid';
        const headers = new Headers(request.headers);
        headers.delete('content-length');
        signedIn = await handlers.POST(
          new Request(request.url, { method: 'POST', headers, body: JSON.stringify({ ...body, email }) }),
        );
      } else signedIn = await handlers.POST(request);
      return null;
    }, '/api/auth/[...all]');
    return signedIn ?? failure;
  }
  if (!new URL(request.url).pathname.endsWith('/sign-up/email')) return handlers.POST(request);
  let response: Response | undefined;
  const failure = await api(async () => {
    checkOrigin(request);
    const body = z
      .object({
        accountRole: z.enum(['manager', 'surveyor']).optional(),
        surveyorProfile: z.unknown().optional(),
      })
      .parse(await readJson(request.clone(), 20000));
    if (body.accountRole !== 'surveyor') {
      response = await handlers.POST(request);
      return null;
    }
    const registration = {
      profile: surveyorProfileSchema.parse(body.surveyorProfile),
      pendingUserId: undefined as string | undefined,
    };
    try {
      response = await surveyorRegistration.run(registration, () => handlers.POST(request));
    } finally {
      if (registration.pendingUserId && !response?.ok)
        await discardUncreatedProfile(registration.pendingUserId);
    }
    return null;
  }, '/api/auth/[...all]');
  return response ?? failure;
}
export const runtime = 'nodejs';
