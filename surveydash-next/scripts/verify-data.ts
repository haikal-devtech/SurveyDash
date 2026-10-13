import { readFile } from 'node:fs/promises';
import { getAuthDatabase, closeDatabase } from '../src/lib/db';
import { Pool } from 'pg';
const path = process.argv[2];
if (!path) throw new Error('Berikan lokasi backup untuk verifikasi.');
const backup = JSON.parse(await readFile(path, 'utf8'));
const database = getAuthDatabase();
if (!(database instanceof Pool)) throw new Error('Verifikasi ini membutuhkan database cloud.');
const client = await database.connect();
function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const result: Record<string, { original: number; current: number; missing: number; changed: number }> = {};
  for (const table of ['surveys', 'submissions', 'audit', 'templates', 'user', 'account']) {
    const rows = (await client.query(`SELECT * FROM "${table}"`)).rows;
    const indexed = new Map(rows.map((row) => [row.id, row]));
    const original = backup.tables[table] ?? [];
    let missing = 0,
      changed = 0;
    for (const row of original) {
      const current = indexed.get(row.id);
      if (!current) {
        missing++;
        continue;
      }
      if (canonical(row) !== canonical(current)) changed++;
    }
    result[table] = { original: original.length, current: rows.length, missing, changed };
  }
  await client.query('COMMIT');
  console.log(
    JSON.stringify({
      verification: result,
      allOriginalRowsPresent: Object.values(result).every((row) => !row.missing),
    }),
  );
  if (Object.values(result).some((row) => row.missing)) process.exitCode = 1;
} finally {
  client.release();
  await closeDatabase();
}
