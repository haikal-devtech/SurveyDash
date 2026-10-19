import { cookies } from 'next/headers';
import { requireManagerUser } from '@/lib/http';
import { authBaseUrl } from '@/lib/origins';
import {
  completeGoogleConnection,
  GOOGLE_FORMS_CALLBACK_PATH,
  GOOGLE_FORMS_STATE_COOKIE,
} from '@/lib/google-forms';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const store = await cookies();
  const saved = store.get(GOOGLE_FORMS_STATE_COOKIE)?.value;
  store.set(GOOGLE_FORMS_STATE_COOKIE, '', {
    httpOnly: true,
    secure: new URL(authBaseUrl()).protocol === 'https:',
    sameSite: 'lax',
    path: GOOGLE_FORMS_CALLBACK_PATH,
    maxAge: 0,
  });
  const target = new URL('/studio/import', authBaseUrl());
  try {
    const user = await requireManagerUser();
    const state = parameters.get('state');
    const code = parameters.get('code');
    if (parameters.has('error') || !saved || !state || !code || state.length > 256 || code.length > 4000)
      throw new Error('OAuth denied or incomplete');
    await completeGoogleConnection(user.id, saved, state, code);
    target.searchParams.set('google', 'connected');
  } catch {
    target.searchParams.set('google', 'failed');
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
