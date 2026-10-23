import { getDb } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await getDb().prepare('SELECT 1 AS ok').get();
    const failures = await getDb()
      .prepare('SELECT count(*) AS n FROM operation_events WHERE at >= ?')
      .get(new Date(Date.now() - 15 * 60000).toISOString());
    if (Number(failures.n) >= 20)
      return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'public, max-age=15' } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
