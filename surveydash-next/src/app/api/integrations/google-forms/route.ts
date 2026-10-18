import { cookies } from 'next/headers';
import { z } from 'zod';
import { api, checkOrigin, readJson, requireManagerUser } from '@/lib/http';
import { authBaseUrl } from '@/lib/origins';
import {
  beginGoogleConnection,
  disconnectGoogleConnection,
  fetchConnectedGoogleForm,
  googleConnectionStatus,
  GOOGLE_FORMS_STATE_COOKIE,
  GOOGLE_FORMS_CALLBACK_PATH,
} from '@/lib/google-forms';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => googleConnectionStatus((await requireManagerUser()).id));
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireManagerUser();
    const body = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('connect') }),
        z.object({ action: z.literal('preview'), formId: z.string().min(10).max(1000) }),
      ])
      .parse(await readJson(request));
    if (body.action === 'preview') return fetchConnectedGoogleForm(user.id, body.formId);
    const connection = await beginGoogleConnection(user.id);
    (await cookies()).set(GOOGLE_FORMS_STATE_COOKIE, connection.cookie, {
      httpOnly: true,
      secure: new URL(authBaseUrl()).protocol === 'https:',
      sameSite: 'lax',
      path: GOOGLE_FORMS_CALLBACK_PATH,
      maxAge: 600,
    });
    return { url: connection.url };
  });
}
export async function DELETE(request: Request) {
  return api(async () => {
    checkOrigin(request);
    await disconnectGoogleConnection((await requireManagerUser()).id);
    return { disconnected: true };
  });
}
