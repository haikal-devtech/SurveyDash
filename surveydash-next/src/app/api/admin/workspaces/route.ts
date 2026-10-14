import { cookies } from 'next/headers';
import { z } from 'zod';
import { api, checkOrigin, readJson, requireAdmin, requireUser } from '@/lib/http';
import { listAdminWorkspaces, validateWorkspaceSwitch, WORKSPACE_COOKIE } from '@/lib/access-repository';
export const runtime = 'nodejs';
export async function GET() {
  return api(async () => listAdminWorkspaces((await requireAdmin()).id));
}
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const { ownerId } = z.object({ ownerId: z.string().min(1).max(100) }).parse(await readJson(request));
    await validateWorkspaceSwitch(user.id, ownerId);
    (await cookies()).set(WORKSPACE_COOKIE, ownerId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !!process.env.VERCEL,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 * 8,
    });
    return { ownerId };
  });
}
