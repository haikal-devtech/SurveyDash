import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { discoverBackupTables, quoteIdentifier } from './backup-format';
type Row = Record<string, unknown>;
const canonical = (rows: Row[]) =>
  rows
    .map((row) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(JSON.parse(JSON.stringify(row)) as Row).sort(([a], [b]) => a.localeCompare(b)),
        ),
      ),
    )
    .sort((a, b) => a.localeCompare(b, 'en'));
/** Compatibility for existing v1 JSON files; new backups use encrypted streaming v2. */
export async function restoreLegacy(
  client: PoolClient,
  backup: { version: number; tables: Record<string, Row[]> },
  schema = 'public',
) {
  assert.equal(backup.version, 1);
  const target = await discoverBackupTables(client, schema),
    available = new Set(target.map((table) => table.name));
  for (const name of Object.keys(backup.tables))
    if (name !== 'app_migrations' && !available.has(name))
      throw new Error('Backup memiliki tabel yang belum tersedia pada skema target.');
  let total = 0;
  for (const table of target) {
    const rows = backup.tables[table.name];
    if (!rows) continue;
    const name = quoteIdentifier(schema) + '.' + quoteIdentifier(table.name);
    if (Number((await client.query(`SELECT count(*) AS n FROM ${name}`)).rows[0].n))
      throw new Error('Target restore harus kosong; tidak ada data yang ditimpa.');
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    let offset = 0;
    while (offset < rows.length) {
      const batch: Row[] = [];
      let bytes = 0;
      while (
        offset < rows.length &&
        batch.length < Math.min(250, Math.floor(30000 / columns.length)) &&
        bytes < 1_000_000
      ) {
        const row = rows[offset++];
        batch.push(row);
        bytes += Buffer.byteLength(JSON.stringify(row));
      }
      const values: unknown[] = [];
      const placeholders = batch
        .map(
          (row) =>
            '(' +
            columns
              .map((column) => {
                values.push(row[column]);
                return '$' + values.length;
              })
              .join(',') +
            ')',
        )
        .join(',');
      await client.query(
        `INSERT INTO ${name} (${columns.map(quoteIdentifier).join(',')}) VALUES ${placeholders}`,
        values,
      );
    }
    const restored = (await client.query(`SELECT ${columns.map(quoteIdentifier).join(',')} FROM ${name}`))
      .rows;
    assert.deepEqual(canonical(restored), canonical(rows));
    total += rows.length;
  }
  return { restoreVerified: true, format: 1, rows: total };
}
