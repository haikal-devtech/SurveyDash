import { api, requireWorkspaceUser } from '@/lib/http';
import { exportResponseCsv, getResponsePage } from '@/lib/responses-repository';
import { exportResponseXlsx } from '@/lib/responses-xlsx';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request, context: Context) {
  let download: Response | undefined;
  const result = await api(async () => {
    const user = await requireWorkspaceUser();
    const { id } = await context.params;
    const parameters = new URL(request.url).searchParams;
    const input = Object.fromEntries(parameters);
    if (parameters.get('format') === 'xlsx') {
      download = await exportResponseXlsx(id, user.ownerId, input, request.signal);
      return null;
    }
    if (parameters.get('format') === 'csv') {
      download = await exportResponseCsv(id, user.ownerId, input, request.signal);
      return null;
    }
    return getResponsePage(id, user.ownerId, input);
  }, '/api/surveys/[id]/responses');
  return download ?? result;
}
