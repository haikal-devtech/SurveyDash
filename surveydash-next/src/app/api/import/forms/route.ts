import { z } from 'zod';
import { api, checkOrigin, readJson, requireWorkspaceUser } from '@/lib/http';
import { prepareFormImport, commitFormImport } from '@/lib/form-import-repository';
import { MAX_IMPORT_REQUEST_BYTES } from '@/lib/form-import-limits';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireWorkspaceUser();
    const input = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('preview'), source: z.unknown() }),
        z.object({ action: z.literal('import'), batchId: z.uuid(), acknowledge: z.boolean().default(false) }),
      ])
      .parse(await readJson(request, MAX_IMPORT_REQUEST_BYTES));
    if (input.action === 'preview') return prepareFormImport(user.ownerId, user.id, input.source, 'file');
    return commitFormImport(user.ownerId, user.id, input.batchId, input.acknowledge);
  });
}
