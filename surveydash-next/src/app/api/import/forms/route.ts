import { z } from 'zod';
import { api, checkOrigin, readJson, requireUser } from '@/lib/http';
import { parseFormsImport } from '@/lib/forms-import';
import { createSurvey, updateSurvey, AppError } from '@/lib/repository';
import { getDb } from '@/lib/db';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ source: z.unknown(), acknowledge: z.boolean().default(false) })
      .parse(await readJson(request, 500000));
    let imported;
    try {
      imported = parseFormsImport(input.source);
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'JSON tidak valid.');
    }
    if (imported.warnings.length && !input.acknowledge)
      throw new AppError('Tinjau dan setujui catatan impor terlebih dahulu.');
    return getDb().transaction(async () => {
      const survey = await createSurvey(user.id, imported.title, 'blank');
      return updateSurvey(survey.id, user.id, {
        ...survey,
        description: imported.description,
        questions: imported.questions,
      });
    });
  });
}
