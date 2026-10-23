import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { readEncryptedBackup, writeEncryptedBackup, type BackupRecord } from '../src/lib/backup-format';
test('streaming backups round-trip Unicode without plaintext and reject wrong keys, truncated or modified files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'studio-backup-v2-'));
  const path = join(folder, 'test.sdb.enc'),
    secret = 'test-only-backup-encryption-secret-0000000000000000';
  const records: BackupRecord[] = [
    {
      type: 'manifest',
      version: 2,
      createdAt: new Date().toISOString(),
      tables: [{ name: 'surveys', columns: ['id', 'payload'], primaryKeys: ['id'] }],
    },
    { type: 'row', table: 'surveys', row: { id: 'one', payload: 'Jawaban rahasia äé 🇮🇩' } },
    { type: 'complete', summary: { surveys: { count: 1, hash: 'synthetic' } } },
  ];
  async function* input() {
    yield* records;
  }
  const collect = async (file: string, key: string) => {
    const result: BackupRecord[] = [];
    for await (const record of readEncryptedBackup(file, key)) result.push(record);
    return result;
  };
  try {
    await writeEncryptedBackup(path, input(), secret);
    const bytes = await readFile(path);
    assert.equal(bytes.includes(Buffer.from('Jawaban rahasia')), false);
    assert.deepEqual(await collect(path, secret), records);
    await assert.rejects(() => collect(path, secret + 'wrong'));
    const tampered = Buffer.from(bytes);
    tampered[Math.floor(tampered.length / 2)] ^= 1;
    const bad = join(folder, 'bad.sdb.enc');
    await writeFile(bad, tampered);
    await assert.rejects(() => collect(bad, secret));
    const truncated = join(folder, 'truncated.sdb.enc');
    await writeFile(truncated, bytes.subarray(0, bytes.length - 8));
    await assert.rejects(() => collect(truncated, secret));
  } finally {
    assert.ok(
      resolve(folder).startsWith(resolve(tmpdir()) + sep) && resolve(folder).includes('studio-backup-v2-'),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
