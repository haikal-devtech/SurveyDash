import { readFile, open, readdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { getAuthDatabase, closeDatabase } from '../src/lib/db';
import { readEncryptedBackup, restoreRecords } from '../src/lib/backup-format';
import { restoreLegacy } from '../src/lib/restore-legacy';
async function main() {
  if (process.env.ALLOW_STAGING_RESTORE !== 'true')
    throw new Error('Restore harus dipilih secara eksplisit pada database staging kosong.');
  const latest =
    process.argv[2] === '--latest'
      ? (await readdir('.data/backups'))
          .filter((name) => name.endsWith('.sdb.enc'))
          .sort()
          .at(-1)
      : undefined;
  const path =
    process.argv[2] === '--latest' ? (latest ? '.data/backups/' + latest : undefined) : process.argv[2];
  if (!path) throw new Error('Tentukan berkas backup yang akan diverifikasi.');
  const file = await open(path, 'r'),
    header = Buffer.alloc(4);
  try {
    await file.read(header, 0, 4, 0);
  } finally {
    await file.close();
  }
  const database = getAuthDatabase();
  if (!(database instanceof Pool)) throw new Error('Restore memerlukan PostgreSQL staging.');
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result =
      header.toString() === 'SDB2'
        ? await restoreRecords(client, readEncryptedBackup(path, process.env.BACKUP_ENCRYPTION_KEY ?? ''))
        : await restoreLegacy(client, JSON.parse(await readFile(path, 'utf8')));
    await client.query('COMMIT');
    console.log(JSON.stringify({ ...result, destination: 'empty staging database' }));
  } catch (error) {
    await client.query('ROLLBACK');
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
      operation: 'restore-staging',
      passed: false,
      code: /^[A-Z0-9_]{1,40}$/i.test(candidate) ? candidate : 'FAILURE',
    }),
  );
  process.exitCode = 1;
});
