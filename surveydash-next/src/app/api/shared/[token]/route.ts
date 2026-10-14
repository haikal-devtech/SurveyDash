import { api } from '@/lib/http';
import { getSharedPresentation } from '@/lib/share-repository';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  return api(async () => getSharedPresentation((await context.params).token));
}
