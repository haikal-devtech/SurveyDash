import { cookies } from 'next/headers';
import { validateWorkspaceSwitch, WORKSPACE_COOKIE } from './access-repository';
export async function switchWorkspace(userId: string, ownerId: string) {
  await validateWorkspaceSwitch(userId, ownerId);
  (await cookies()).set(WORKSPACE_COOKIE, ownerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !!process.env.VERCEL,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600 * 8,
  });
  return { ownerId };
}
