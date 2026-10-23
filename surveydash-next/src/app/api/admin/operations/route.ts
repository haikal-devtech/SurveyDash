import { api, requireAdmin } from '@/lib/http';
import { operationReadiness } from '@/lib/operations';
export async function GET() {
  return api(async () => {
    await requireAdmin();
    return operationReadiness();
  }, '/api/admin/operations');
}
