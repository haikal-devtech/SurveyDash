import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { StringDecoder } from 'node:string_decoder';
import type { PoolClient } from 'pg';

type Row = Record<string, unknown>;
export interface BackupTable {
  name: string;
  columns: string[];
  primaryKeys: string[];
}
export type BackupRecord =
  | { type: 'manifest'; version: 2; createdAt: string; tables: BackupTable[] }
  | { type: 'row'; table: string; row: Row }
  | { type: 'complete'; summary: Record<string, { count: number; hash: string }> };
const MAGIC = Buffer.from('SDB2');
export const quoteIdentifier = (value: string) => {
  if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(value)) throw new Error('Identifier backup tidak valid.');
  return '"' + value + '"';
};
const qualified = (schema: string, table: string) => quoteIdentifier(schema) + '.' + quoteIdentifier(table);
const normalized = (row: Row) => JSON.parse(JSON.stringify(row)) as Row;
const canonical = (row: Row) =>
  JSON.stringify(Object.fromEntries(Object.entries(normalized(row)).sort(([a], [b]) => a.localeCompare(b))));
const encryptionKey = (secret: string) => {
  if (secret.length < 32)
    throw new Error('BACKUP_ENCRYPTION_KEY minimal 32 karakter dan harus disimpan terpisah dari backup.');
  return createHash('sha256')
    .update('surveydash-backup-v2:' + secret)
    .digest();
};
export async function discoverBackupTables(client: PoolClient, schema = 'public'): Promise<BackupTable[]> {
  const tables = (
    await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'app_migrations' ORDER BY table_name",
      [schema],
    )
  ).rows.map((row) => String(row.table_name));
  const dependencies = (
    await client.query(
      `SELECT child.relname AS child, parent.relname AS parent FROM pg_constraint fk
    JOIN pg_class child ON child.oid = fk.conrelid JOIN pg_namespace cn ON cn.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = fk.confrelid JOIN pg_namespace pn ON pn.oid = parent.relnamespace
    WHERE fk.contype = 'f' AND cn.nspname = $1 AND pn.nspname = $1`,
      [schema],
    )
  ).rows;
  const remaining = new Set(tables),
    ordered: string[] = [];
  while (remaining.size) {
    const next = [...remaining].find(
      (name) =>
        !dependencies.some(
          (edge) => edge.child === name && edge.parent !== name && remaining.has(edge.parent),
        ),
    );
    if (!next)
      throw new Error('Skema memiliki siklus relasi; gunakan backup native database untuk skema ini.');
    ordered.push(next);
    remaining.delete(next);
  }
  const result: BackupTable[] = [];
  for (const name of ordered) {
    const columns = (
      await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
        [schema, name],
      )
    ).rows.map((row) => String(row.column_name));
    const primaryKeys = (
      await client.query(
        `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary ORDER BY array_position(i.indkey::smallint[], a.attnum)`,
        [qualified(schema, name)],
      )
    ).rows.map((row) => String(row.attname));
    if (!primaryKeys.length) throw new Error('Tabel tanpa primary key memerlukan backup native: ' + name);
    result.push({ name, columns, primaryKeys });
  }
  return result;
}
async function* tableRows(client: PoolClient, table: BackupTable, schema: string) {
  const cursor = 'backup_' + randomBytes(8).toString('hex');
  await client.query(
    `DECLARE ${quoteIdentifier(cursor)} NO SCROLL CURSOR FOR SELECT ${table.columns.map(quoteIdentifier).join(',')} FROM ${qualified(schema, table.name)} ORDER BY ${table.primaryKeys.map(quoteIdentifier).join(',')}`,
  );
  try {
    while (true) {
      const rows = (await client.query(`FETCH FORWARD 250 FROM ${quoteIdentifier(cursor)}`)).rows;
      if (!rows.length) return;
      for (const row of rows) yield normalized(row);
    }
  } finally {
    await client.query('CLOSE ' + quoteIdentifier(cursor));
  }
}
export async function* backupRecords(client: PoolClient, schema = 'public'): AsyncGenerator<BackupRecord> {
  const tables = await discoverBackupTables(client, schema);
  yield { type: 'manifest', version: 2, createdAt: new Date().toISOString(), tables };
  const summary: Record<string, { count: number; hash: string }> = {};
  for (const table of tables) {
    const digest = createHash('sha256');
    let count = 0;
    for await (const row of tableRows(client, table, schema)) {
      digest.update(canonical(row) + '\n');
      count++;
      yield { type: 'row', table: table.name, row };
    }
    summary[table.name] = { count, hash: digest.digest('hex') };
  }
  yield { type: 'complete', summary };
}
export async function writeEncryptedBackup(
  path: string,
  records: AsyncIterable<BackupRecord>,
  secret: string,
) {
  const nonce = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), nonce);
  cipher.setAAD(MAGIC);
  const chunks = async function* () {
    yield Buffer.concat([MAGIC, nonce]);
    for await (const record of records) yield cipher.update(JSON.stringify(record) + '\n', 'utf8');
    yield cipher.final();
    yield cipher.getAuthTag();
  };
  await pipeline(Readable.from(chunks()), createWriteStream(path, { flags: 'wx', mode: 0o600 }));
}
/** Consumers must finish the iterator before committing: the final GCM tag authenticates the stream. */
export async function* readEncryptedBackup(path: string, secret: string): AsyncGenerator<BackupRecord> {
  const file = await open(path, 'r');
  let size: number, header: Buffer, tag: Buffer;
  try {
    size = (await file.stat()).size;
    if (size < 33) throw new Error('Backup tidak lengkap.');
    header = Buffer.alloc(16);
    tag = Buffer.alloc(16);
    await file.read(header, 0, 16, 0);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  if (!header.subarray(0, 4).equals(MAGIC)) throw new Error('Format backup bukan SDB2.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), header.subarray(4));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  const decrypted = createReadStream(path, { start: 16, end: size - 17 }).compose(decipher);
  const decoder = new StringDecoder('utf8');
  let pending = '';
  for await (const chunk of decrypted) {
    pending += decoder.write(chunk as Buffer);
    if (pending.length > 20_000_000) throw new Error('Baris backup terlalu besar.');
    let newline: number;
    while ((newline = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      if (line) yield JSON.parse(line) as BackupRecord;
    }
  }
  pending += decoder.end();
  if (pending.trim()) throw new Error('Akhir backup tidak lengkap.');
}
export async function restoreRecords(
  client: PoolClient,
  records: AsyncIterable<BackupRecord>,
  schema = 'public',
) {
  let manifest: Extract<BackupRecord, { type: 'manifest' }> | undefined,
    complete: Extract<BackupRecord, { type: 'complete' }> | undefined;
  const sourceDigests = new Map<string, ReturnType<typeof createHash>>(),
    counts = new Map<string, number>();
  let batch: Row[] = [],
    current = '',
    bytes = 0;
  const flush = async () => {
    if (!batch.length || !manifest) return;
    const table = manifest.tables.find((entry) => entry.name === current)!;
    const values: unknown[] = [];
    const placeholders = batch
      .map(
        (row) =>
          '(' +
          table.columns
            .map((column) => {
              values.push(row[column]);
              return '$' + values.length;
            })
            .join(',') +
          ')',
      )
      .join(',');
    await client.query(
      `INSERT INTO ${qualified(schema, current)} (${table.columns.map(quoteIdentifier).join(',')}) VALUES ${placeholders}`,
      values,
    );
    batch = [];
    bytes = 0;
  };
  for await (const record of records) {
    if (complete) throw new Error('Ada data setelah penutup backup.');
    if (record.type === 'manifest') {
      if (manifest || record.version !== 2 || !Array.isArray(record.tables))
        throw new Error('Manifest backup tidak valid.');
      manifest = record;
      const available = new Set(
        (
          await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
            [schema],
          )
        ).rows.map((row) => row.table_name),
      );
      for (const table of manifest.tables) {
        if (!available.has(table.name) || !table.columns.length || !table.primaryKeys.length)
          throw new Error('Skema target tidak mendukung tabel backup.');
        if (
          Number((await client.query(`SELECT count(*) AS n FROM ${qualified(schema, table.name)}`)).rows[0].n)
        )
          throw new Error('Target restore harus kosong; tidak ada data yang ditimpa.');
        sourceDigests.set(table.name, createHash('sha256'));
        counts.set(table.name, 0);
      }
    } else if (record.type === 'row') {
      if (!manifest || !sourceDigests.has(record.table)) throw new Error('Tabel baris backup tidak dikenal.');
      if (current && current !== record.table) await flush();
      current = record.table;
      const text = canonical(record.row);
      sourceDigests.get(current)!.update(text + '\n');
      counts.set(current, counts.get(current)! + 1);
      batch.push(record.row);
      bytes += Buffer.byteLength(text);
      const columns = manifest.tables.find((table) => table.name === current)!.columns.length;
      if (batch.length >= 250 || batch.length * columns >= 30000 || bytes >= 1_000_000) await flush();
    } else if (record.type === 'complete') {
      await flush();
      complete = record;
    } else throw new Error('Jenis catatan backup tidak dikenal.');
  }
  if (!manifest || !complete) throw new Error('Backup belum lengkap atau autentikasinya gagal.');
  for (const table of manifest.tables) {
    const expected = complete.summary[table.name];
    if (
      !expected ||
      expected.count !== counts.get(table.name) ||
      expected.hash !== sourceDigests.get(table.name)!.digest('hex')
    )
      throw new Error('Checksum sumber backup tidak cocok.');
    const digest = createHash('sha256');
    let count = 0;
    for await (const row of tableRows(client, table, schema)) {
      count++;
      digest.update(canonical(row) + '\n');
    }
    if (count !== expected.count || digest.digest('hex') !== expected.hash)
      throw new Error('Verifikasi data hasil restore tidak cocok.');
  }
  return {
    restoreVerified: true,
    tables: manifest.tables.length,
    rows: [...counts.values()].reduce((sum, count) => sum + count, 0),
  };
}
