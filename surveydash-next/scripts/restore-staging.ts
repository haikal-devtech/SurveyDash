import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { getAuthDatabase, closeDatabase } from '../src/lib/db';
if (process.env.ALLOW_STAGING_RESTORE !== 'true')
  throw new Error('Restore harus dipilih secara eksplisit pada database staging kosong.');
const backup = JSON.parse(await readFile(process.argv[2], 'utf8')) as {
  version: number;
  tables: Record<string, Record<string, unknown>[]>;
};
assert.equal(backup.version, 1);
const database = getAuthDatabase();
if (!(database instanceof Pool)) throw new Error('Restore memerlukan PostgreSQL staging.');
const quote = (name: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Identifier tidak valid.');
  return `"${name}"`;
};
const order = [
  'user',
  'account',
  'session',
  'verification',
  'rateLimit',
  'surveys',
  'templates',
  'submissions',
  'audit',
  'public_rate_limits',
  'workspace_settings',
  'account_guides',
  'platform_admins',
  'google_form_connections',
  'form_import_batches',
  'submission_import_sources',
  'surveyor_profiles',
  'surveyor_assignments',
  'surveyor_assignment_regions',
  'surveyor_invitations',
  'submission_attribution',
  'cleaning_settings',
  'cleaning_reviews',
  'cleaning_review_audit',
  'presentations',
  'presentation_assets',
  'presentation_shares',
];
const canonical = (rows: Record<string, unknown>[]) =>
  rows
    .map((row) =>
      JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))),
    )
    .sort();
const client = await database.connect();
try {
  await client.query('BEGIN');
  for (const name of order) {
    const rows = backup.tables[name];
    if (!rows) continue;
    const current = await client.query(`SELECT count(*) AS total FROM ${quote(name)}`);
    if (Number(current.rows[0].total))
      throw new Error('Target restore harus kosong; tidak ada data yang akan ditimpa.');
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const parameters: unknown[] = [];
    const values = rows
      .map(
        (row) =>
          `(${columns
            .map((column) => {
              parameters.push(row[column]);
              return `$${parameters.length}`;
            })
            .join(',')})`,
      )
      .join(',');
    await client.query(
      `INSERT INTO ${quote(name)}(${columns.map(quote).join(',')}) VALUES ${values}`,
      parameters,
    );
    const restored = (await client.query(`SELECT * FROM ${quote(name)}`)).rows;
    assert.deepEqual(canonical(restored), canonical(rows));
  }
  await client.query('COMMIT');
  console.log(
    JSON.stringify({
      restoreVerified: true,
      destination: 'empty staging database',
      rowCounts: Object.fromEntries(Object.entries(backup.tables).map(([name, rows]) => [name, rows.length])),
    }),
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await closeDatabase();
}
