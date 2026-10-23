import { mkdir, unlink } from 'node:fs/promises';
import { Pool } from 'pg';
import { getAuthDatabase, closeDatabase } from '../src/lib/db';
import { backupRecords, writeEncryptedBackup } from '../src/lib/backup-format';
import { randomUUID } from 'node:crypto';
async function main() {
  const secret = process.env.BACKUP_ENCRYPTION_KEY ?? '';
  if (secret.length < 32)
    throw new Error(
      'Atur BACKUP_ENCRYPTION_KEY minimal 32 karakter. Jangan simpan kunci bersama berkas backup.',
    );
  const database = getAuthDatabase();
  if (!(database instanceof Pool)) throw new Error('Backup cloud memerlukan DATABASE_URL PostgreSQL.');
  const client = await database.connect();
  await mkdir('.data/backups', { recursive: true });
  const path = `.data/backups/studio-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}.sdb.enc`;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await writeEncryptedBackup(path, backupRecords(client), secret);
    await client.query('COMMIT');
    console.log(
      JSON.stringify({ backup: path, encrypted: true, format: 2, source: 'read-only repeatable snapshot' }),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST'))
      await unlink(path).catch(() => {});
    throw error;
  } finally {
    client.release();
    await closeDatabase();
  }
}
await main().catch(async (error: unknown) => {
  await closeDatabase().catch(() => {});
  const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'FAILURE';
  console.error(
    JSON.stringify({
      operation: 'backup',
      passed: false,
      code: /^[A-Z0-9_]{1,40}$/i.test(candidate) ? candidate : 'FAILURE',
    }),
  );
  process.exitCode = 1;
});
