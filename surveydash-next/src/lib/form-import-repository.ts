import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { AppError, createSurvey, getSurvey, updateSurvey } from './repository';
import { openGooglePayload, sealGooglePayload } from './google-forms';
import { parseFormWithResponses, type FormImportPreview } from './form-responses-import';

export async function prepareFormImport(
  ownerId: string,
  actorId: string,
  source: unknown,
  provider: 'google-forms' | 'file',
): Promise<FormImportPreview> {
  let parsed;
  try {
    parsed = parseFormWithResponses(source);
  } catch {
    throw new AppError(
      'Data form atau jawaban tidak valid. Gunakan JSON Google Forms API dengan tanggal dan ID respons yang lengkap. Maksimal 10.000 respons / 10 MB.',
    );
  }
  const db = getDb();
  const batchId = randomUUID();
  await db.prepare('DELETE FROM form_import_batches WHERE expires_at < ?').run(new Date().toISOString());
  // Keep at most three pending previews per person/workspace, with encrypted PII and a short TTL.
  const pending = await db
    .prepare(
      'SELECT id FROM form_import_batches WHERE owner_id = ? AND actor_id = ? AND survey_id IS NULL ORDER BY expires_at DESC',
    )
    .all(ownerId, actorId);
  for (const row of pending.slice(2))
    await db.prepare('DELETE FROM form_import_batches WHERE id = ?').run(String(row.id));
  await db
    .prepare(
      'INSERT INTO form_import_batches (id, owner_id, actor_id, ciphertext, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(
      batchId,
      ownerId,
      actorId,
      sealGooglePayload(ownerId + ':' + actorId + ':' + batchId, 'import', { source, provider }),
      new Date(Date.now() + 15 * 60_000).toISOString(),
    );
  return {
    batchId,
    title: parsed.title,
    questions: parsed.questions.map((q) => ({ id: q.id, label: q.label })),
    responseCount: parsed.responses.length,
    warnings: parsed.warnings,
  };
}

export async function commitFormImport(
  ownerId: string,
  actorId: string,
  batchId: string,
  acknowledge: boolean,
) {
  const db = getDb();
  return db.transaction(async () => {
    await db.lockOwner(ownerId);
    const batch = await db
      .prepare(
        'SELECT * FROM form_import_batches WHERE id = ? AND owner_id = ? AND actor_id = ?' + db.lockSuffix,
      )
      .get(batchId, ownerId, actorId);
    if (!batch || String(batch.expires_at) < new Date().toISOString())
      throw new AppError('Pratinjau sudah kedaluwarsa. Tinjau form lagi.', 410);
    if (batch.survey_id) return getSurvey(String(batch.survey_id), ownerId);
    const saved = openGooglePayload(
      ownerId + ':' + actorId + ':' + batchId,
      'import',
      String(batch.ciphertext),
    ) as { source: unknown; provider: string };
    const parsed = parseFormWithResponses(saved.source);
    if (parsed.warnings.length && !acknowledge)
      throw new AppError('Tinjau dan setujui catatan impor terlebih dahulu.');
    let survey = await createSurvey(ownerId, parsed.title, 'blank');
    survey = await updateSurvey(survey.id, ownerId, {
      ...survey,
      description: parsed.description,
      questions: parsed.questions,
      visibility: 'private',
      kind: 'custom',
      status: 'draft',
    });
    const snapshot = JSON.stringify(survey.questions);
    const now = new Date().toISOString();
    for (let offset = 0; offset < parsed.responses.length; offset += 100) {
      const rows = parsed.responses.slice(offset, offset + 100).map((row) => ({ ...row, id: randomUUID() }));
      await db
        .prepare(
          'INSERT INTO submissions (id, survey_id, answers, snapshot, submitted_at, request_key) VALUES ' +
            rows.map(() => '(?, ?, ?, ?, ?, ?)').join(','),
        )
        .run(
          ...rows.flatMap((row) => [
            row.id,
            survey.id,
            JSON.stringify(row.answers),
            snapshot,
            row.submittedAt,
            'import:' + row.sourceId,
          ]),
        );
      await db
        .prepare(
          'INSERT INTO submission_import_sources (submission_id, survey_id, provider, source_form_id, response_id, raw_answers, imported_at, imported_by) VALUES ' +
            rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(','),
        )
        .run(
          ...rows.flatMap((row) => [
            row.id,
            survey.id,
            saved.provider,
            parsed.sourceFormId,
            row.sourceId,
            JSON.stringify(row.raw),
            now,
            actorId,
          ]),
        );
    }
    // Retain only the receipt so a retry returns the same survey instead of duplicating responses.
    await db
      .prepare('UPDATE form_import_batches SET survey_id = ?, ciphertext = ?, expires_at = ? WHERE id = ?')
      .run(survey.id, '', new Date(Date.now() + 86_400_000).toISOString(), batchId);
    return getSurvey(survey.id, ownerId);
  });
}
