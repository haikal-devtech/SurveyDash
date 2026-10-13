import { listPublicSurveys } from '@/lib/repository';
export const runtime = 'nodejs';
export async function GET() {
  return Response.json(await listPublicSurveys(), { headers: { 'Cache-Control': 'no-store' } });
}
