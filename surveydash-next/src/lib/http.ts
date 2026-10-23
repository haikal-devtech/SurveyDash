import { headers, cookies } from 'next/headers';
import { resolveAccess, WORKSPACE_COOKIE, isPlatformAdmin } from './access-repository';
import { auth } from './auth';
import { AppError } from './repository';
import { ZodError } from 'zod';
import { trustedOrigins } from './origins';
import { ModelError } from './model';
import { assertManager, assertSurveyor } from './account-repository';
import { WORKSPACE_HEADER } from './workspace-request';
import { workspaceRole, assertWorkspaceRole } from './workspace-roles';
import { randomUUID } from 'node:crypto';
import { recordFailure } from './operations';

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AppError('Silakan masuk untuk mengelola survei.', 401);
  return session.user;
}
export async function requireWorkspaceUser(
  options: { write?: boolean; area?: 'data' | 'field' | 'shell' } = {},
) {
  const user = await requireManagerUser();
  const access = await resolveAccess(user.id, (await cookies()).get(WORKSPACE_COOKIE)?.value);
  const expected = (await headers()).get(WORKSPACE_HEADER);
  if ((options.write && !expected) || (expected && expected !== access.ownerId))
    throw new AppError(
      'Workspace telah berubah. Buka ulang halaman pada workspace yang dituju; perubahan belum disimpan.',
      409,
    );
  const role = await workspaceRole(user.id, access.ownerId, access.isAdmin);
  assertWorkspaceRole(role, options.write, options.area);
  return { ...user, ...access, workspaceRole: role };
}
export async function requireManagerUser() {
  const user = await requireUser();
  await assertManager(user.id);
  return user;
}
export async function requireSurveyorUser() {
  const user = await requireUser();
  await assertSurveyor(user.id);
  return user;
}
export async function requireAdmin() {
  const user = await requireManagerUser();
  if (!(await isPlatformAdmin(user.id))) throw new AppError('Akses admin diperlukan.', 403);
  return user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Next.js can reconstruct request.url with localhost even for 127.0.0.1.
  // Match the configured origins instead of trusting the incoming Host header.
  if (!origin || !trustedOrigins().includes(origin)) throw new AppError('Asal permintaan tidak valid.', 403);
}
export async function readLimitedBody(request: Request, limit = 250000): Promise<Buffer> {
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw new AppError('Permintaan terlalu besar.', 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError('Permintaan terlalu besar.', 413);
      }
      chunks.push(Buffer.from(result.value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, limit = 250000) {
  const text = (await readLimitedBody(request, limit)).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('Format data tidak valid.');
  }
}
export async function api(work: () => Promise<unknown> | unknown, route = 'application') {
  const eventId = randomUUID();
  const responseHeaders = { 'Cache-Control': 'no-store', 'X-Request-Id': eventId };
  try {
    return Response.json(await work(), { headers: responseHeaders });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json({ error: error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof ModelError) return Response.json({ error: error.message }, { status: 400 });
    await recordFailure(eventId, route, error);
    return Response.json(
      { error: 'Terjadi kesalahan. Kode laporan: ' + eventId, eventId },
      { status: 500, headers: responseHeaders },
    );
  }
}
