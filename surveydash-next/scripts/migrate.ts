import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../src/lib/auth';
import { getAuthDatabase, initializeDatabase, getDb, closeDatabase } from '../src/lib/db';
async function main() {
  const target = process.argv[2];
  if (!['staging', 'production'].includes(target))
    throw new Error('Pilih target staging atau production secara eksplisit.');
  const url =
    process.env.VERCEL_ENV === 'preview' ? process.env.STAGING_DATABASE_URL : process.env.DATABASE_URL;
  if (
    !url ||
    createHash('sha256').update(url).digest('hex') !== process.env.MIGRATION_EXPECTED_DATABASE_SHA256
  )
    throw new Error('Fingerprint target database belum dikonfirmasi.');
  const database = getAuthDatabase();
  if (!(database instanceof Pool)) throw new Error('Migrasi cloud memerlukan PostgreSQL.');
  const client = await database.connect();
  const core = ['user', 'surveys', 'submissions', 'submission_attribution'];
  const counts = async () =>
    Object.fromEntries(
      await Promise.all(
        core.map(async (table) => [
          table,
          Number((await client.query(`SELECT count(*) AS n FROM "${table}"`)).rows[0].n),
        ]),
      ),
    );
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('surveydash.schema'))");
    const before = await counts();
    await initializeDatabase();
    await (await getMigrations(auth.options)).runMigrations();
    const after = await counts();
    if (core.some((table) => after[table] < before[table]))
      throw new Error('Jumlah data inti berkurang; hentikan rilis dan tinjau aktivitas database.');
    await getDb()
      .prepare('INSERT INTO app_migrations VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
      .run('20261023-audit-hardening-v1', new Date().toISOString());
    console.log(
      JSON.stringify({
        migrated: true,
        target,
        version: '20261023-audit-hardening-v1',
        coreCountsDidNotDecrease: true,
      }),
    );
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('surveydash.schema'))").catch(() => {});
    client.release();
    await closeDatabase();
  }
}
await main().catch(async (error: unknown) => {
  await closeDatabase().catch(() => {});
  const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'FAILURE';
  console.error(
    JSON.stringify({
      operation: 'migrate',
      passed: false,
      code: /^[A-Z0-9_]{1,40}$/i.test(candidate) ? candidate : 'FAILURE',
    }),
  );
  process.exitCode = 1;
});
