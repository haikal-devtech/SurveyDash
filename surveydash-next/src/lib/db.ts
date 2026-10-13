import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Pool, type PoolClient } from 'pg';
type Row = Record<string, string | number | null>;
type Parameter = string | number | null;
const globalDb = globalThis as typeof globalThis & {
  studioDb?: DatabaseSync;
  studioPool?: Pool;
  studioTransactions?: AsyncLocalStorage<PoolClient | DatabaseSync>;
  studioQueue?: Promise<void>;
};
const transactions = (globalDb.studioTransactions ??= new AsyncLocalStorage());
export function getAuthDatabase(): Pool | DatabaseSync {
  if (process.env.DATABASE_URL) {
    const connectionUrl = new URL(process.env.DATABASE_URL);
    // Keep certificate verification explicit when pg adopts libpq SSL semantics.
    if (['require', 'prefer', 'verify-ca'].includes(connectionUrl.searchParams.get('sslmode') ?? ''))
      connectionUrl.searchParams.set('sslmode', 'verify-full');
    return (globalDb.studioPool ??= new Pool({
      connectionString: connectionUrl.toString(),
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
    }));
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL wajib diatur untuk deployment Vercel.');
  return getSqlite();
}
function getSqlite() {
  if (globalDb.studioDb) return globalDb.studioDb;
  // Runtime data lives on disk; it must never be bundled into the Next.js output.
  const path = resolve(/* turbopackIgnore: true */ process.env.STUDIO_DB_PATH ?? '.data/studio.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(schema);
  globalDb.studioDb = db;
  return db;
}
const schema = `
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS surveys_owner ON surveys(owner_id);
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id),
      answers TEXT NOT NULL, snapshot TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT NOT NULL, request_key TEXT NOT NULL,
      UNIQUE(survey_id, request_key)
    );
    CREATE INDEX IF NOT EXISTS submissions_survey ON submissions(survey_id);
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL, before_value TEXT NOT NULL, after_value TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS public_rate_limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL
    );`;

async function query(sql: string, parameters: Parameter[]): Promise<Row[]> {
  const connection = transactions.getStore() ?? getAuthDatabase();
  if (connection instanceof DatabaseSync) return connection.prepare(sql).all(...parameters) as Row[];
  let index = 0;
  return (
    await connection.query(
      sql.replace(/\?/g, () => `$${++index}`),
      parameters,
    )
  ).rows as Row[];
}
export function getDb() {
  return {
    prepare(sql: string) {
      return {
        all: (...parameters: Parameter[]) => query(sql, parameters),
        get: async (...parameters: Parameter[]) => (await query(sql, parameters))[0],
        run: async (...parameters: Parameter[]) => {
          await query(sql, parameters);
        },
      };
    },
    get lockSuffix() {
      return process.env.DATABASE_URL && transactions.getStore() ? ' FOR UPDATE' : '';
    },
    async lockOwner(ownerId: string) {
      if (process.env.DATABASE_URL) await query('SELECT pg_advisory_xact_lock(hashtext(?))', [ownerId]);
    },
    async transaction<T>(work: () => Promise<T>): Promise<T> {
      if (transactions.getStore()) return work();
      const database = getAuthDatabase();
      if (database instanceof DatabaseSync) {
        const previous = globalDb.studioQueue ?? Promise.resolve();
        let release!: () => void;
        globalDb.studioQueue = new Promise<void>((resolveQueue) => {
          release = resolveQueue;
        });
        await previous;
        try {
          database.exec('BEGIN IMMEDIATE');
          const result = await transactions.run(database, work);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        } finally {
          release();
        }
      }
      const client = await database.connect();
      try {
        await client.query('BEGIN');
        const result = await transactions.run(client, work);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
export async function initializeDatabase() {
  const database = getAuthDatabase();
  if (database instanceof DatabaseSync) database.exec(schema);
  else await database.query(schema);
}
export async function closeDatabase() {
  globalDb.studioDb?.close();
  await globalDb.studioPool?.end();
  delete globalDb.studioDb;
  delete globalDb.studioPool;
}
