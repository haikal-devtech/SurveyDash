import { mkdir, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { getAuthDatabase, closeDatabase } from '../src/lib/db';
const database = getAuthDatabase();
if (!(database instanceof Pool)) throw new Error('Backup cloud memerlukan DATABASE_URL PostgreSQL.');
const client = await database.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tableNames = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
  const tables: Record<string, unknown[]> = {};
  for (const row of tableNames.rows) {
    const name = String(row.table_name);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Nama tabel tidak didukung.');
    tables[name] = (await client.query(`SELECT * FROM "${name}"`)).rows;
  }
  await client.query('COMMIT');
  await mkdir('.data/backups', { recursive: true });
  const path = `.data/backups/studio-${new Date().toISOString().replaceAll(':', '-')}.json`;
  await writeFile(path, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tables }), { mode: 0o600 });
  console.log(JSON.stringify({ backup: path, rowCounts: Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length])) }));
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await closeDatabase(); }
