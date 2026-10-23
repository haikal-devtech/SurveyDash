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
  const connectionString =
    process.env.VERCEL_ENV === 'preview' ? process.env.STAGING_DATABASE_URL : process.env.DATABASE_URL;
  if (process.env.VERCEL_ENV === 'preview' && !connectionString)
    throw new Error('STAGING_DATABASE_URL wajib untuk preview yang terisolasi.');
  if (connectionString) {
    const connectionUrl = new URL(connectionString);
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
  // Apply the lock wait before changing journal mode: parallel build workers can open this file together.
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
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
    CREATE INDEX IF NOT EXISTS submissions_survey_order ON submissions(survey_id, submitted_at, id);
    CREATE INDEX IF NOT EXISTS submissions_survey_cursor ON submissions(survey_id, id);
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL, before_value TEXT NOT NULL, after_value TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_settings (owner_id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS account_guides (
      user_id TEXT NOT NULL, role TEXT NOT NULL, version INTEGER NOT NULL,
      status TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id, role, version)
    );
    CREATE TABLE IF NOT EXISTS platform_admins (user_id TEXT PRIMARY KEY, granted_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS google_form_connections (
      user_id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS form_import_batches (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, actor_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL, expires_at TEXT NOT NULL, survey_id TEXT
    );
    CREATE TABLE IF NOT EXISTS submission_import_sources (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), survey_id TEXT NOT NULL REFERENCES surveys(id),
      provider TEXT NOT NULL, source_form_id TEXT NOT NULL, response_id TEXT NOT NULL,
      raw_answers TEXT NOT NULL, imported_at TEXT NOT NULL, imported_by TEXT NOT NULL,
      UNIQUE(survey_id, provider, response_id)
    );
    CREATE INDEX IF NOT EXISTS import_sources_survey ON submission_import_sources(survey_id);
    CREATE TABLE IF NOT EXISTS surveyor_profiles (
      user_id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
      payout_ciphertext TEXT NOT NULL, consent_version TEXT NOT NULL, consent_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS surveyor_home_provinces (
      user_id TEXT PRIMARY KEY REFERENCES surveyor_profiles(user_id),
      province_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_members (
      owner_id TEXT NOT NULL, user_id TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1, invited_by TEXT NOT NULL, updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (owner_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS workspace_members_user ON workspace_members(user_id, active);
    CREATE TABLE IF NOT EXISTS workspace_invitations (
      owner_id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS surveyor_assignments (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), owner_id TEXT NOT NULL,
      surveyor_id TEXT NOT NULL REFERENCES surveyor_profiles(user_id), token TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1, assigned_by TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(survey_id, surveyor_id)
    );
    CREATE INDEX IF NOT EXISTS surveyor_assignments_user ON surveyor_assignments(surveyor_id, active);
    CREATE TABLE IF NOT EXISTS surveyor_assignment_regions (
      assignment_id TEXT PRIMARY KEY REFERENCES surveyor_assignments(id),
      province_id TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS survey_province_targets (
      survey_id TEXT NOT NULL REFERENCES surveys(id), province_id TEXT NOT NULL,
      target INTEGER NOT NULL CHECK (target > 0 AND target <= 10000000),
      updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (survey_id, province_id)
    );
    CREATE TABLE IF NOT EXISTS surveyor_invitations (
      survey_id TEXT PRIMARY KEY REFERENCES surveys(id), owner_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submission_attribution (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), assignment_id TEXT NOT NULL REFERENCES surveyor_assignments(id),
      surveyor_id TEXT NOT NULL, username_snapshot TEXT NOT NULL, name_snapshot TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attribution_assignment ON submission_attribution(assignment_id);
    CREATE TABLE IF NOT EXISTS submission_regions (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), province_id TEXT,
      captured_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS submission_regions_province ON submission_regions(province_id);
    CREATE TABLE IF NOT EXISTS submission_timing (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), client_started_at TEXT NOT NULL,
      received_at TEXT NOT NULL, reported_seconds INTEGER
    );
    CREATE TABLE IF NOT EXISTS surveyor_blocks (
      owner_id TEXT NOT NULL, surveyor_id TEXT NOT NULL, active INTEGER NOT NULL,
      reason TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (owner_id, surveyor_id)
    );
    CREATE TABLE IF NOT EXISTS workspace_activity (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, actor TEXT NOT NULL,
      action TEXT NOT NULL, subject_id TEXT NOT NULL, details TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activity_owner ON workspace_activity(owner_id, at);
    CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspace_member_roles (
      owner_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
      updated_by TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (owner_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS fieldwork_details (
      assignment_id TEXT PRIMARY KEY REFERENCES surveyor_assignments(id), coordinator_id TEXT,
      city TEXT NOT NULL, district TEXT NOT NULL, target INTEGER,
      updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS surveyor_payments (
      assignment_id TEXT PRIMARY KEY REFERENCES surveyor_assignments(id), amount BIGINT NOT NULL,
      status TEXT NOT NULL, note TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submission_weights (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), weight DOUBLE PRECISION NOT NULL,
      revision INTEGER NOT NULL, reason TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operation_events (
      id TEXT PRIMARY KEY, route TEXT NOT NULL, error_name TEXT NOT NULL, code TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS operation_events_time ON operation_events(at);
    CREATE TABLE IF NOT EXISTS dataset_versions (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), owner_id TEXT NOT NULL,
      name TEXT NOT NULL, dataset TEXT NOT NULL, payload TEXT NOT NULL, row_count INTEGER NOT NULL,
      method_notes TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dataset_version_rows (
      version_id TEXT NOT NULL REFERENCES dataset_versions(id), submission_id TEXT NOT NULL,
      revision INTEGER NOT NULL, answers TEXT NOT NULL, snapshot TEXT NOT NULL, submitted_at TEXT NOT NULL,
      assignment_id TEXT, surveyor_username TEXT, surveyor_name TEXT, province_id TEXT,
      weight DOUBLE PRECISION NOT NULL, PRIMARY KEY(version_id, submission_id)
    );
    CREATE TABLE IF NOT EXISTS cleaning_keys (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), survey_id TEXT NOT NULL,
      revision INTEGER NOT NULL, config_version TEXT NOT NULL, name_key TEXT NOT NULL,
      account_key TEXT NOT NULL, answer_key TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cleaning_name ON cleaning_keys(survey_id, config_version, name_key);
    CREATE INDEX IF NOT EXISTS cleaning_account ON cleaning_keys(survey_id, config_version, account_key);
    CREATE INDEX IF NOT EXISTS cleaning_answer ON cleaning_keys(survey_id, config_version, answer_key);
    CREATE TABLE IF NOT EXISTS data_requests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, note TEXT NOT NULL,
      status TEXT NOT NULL, operator_note TEXT NOT NULL, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_retention (
      owner_id TEXT PRIMARY KEY, days INTEGER NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cleaning_settings (
      survey_id TEXT PRIMARY KEY REFERENCES surveys(id), payload TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cleaning_reviews (
      submission_id TEXT PRIMARY KEY REFERENCES submissions(id), survey_id TEXT NOT NULL REFERENCES surveys(id),
      status TEXT NOT NULL, reason TEXT NOT NULL, revision INTEGER NOT NULL, actor TEXT NOT NULL, reviewed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cleaning_review_audit (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), submission_id TEXT NOT NULL REFERENCES submissions(id),
      status TEXT NOT NULL, reason TEXT NOT NULL, revision INTEGER NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY, survey_id TEXT NOT NULL REFERENCES surveys(id), owner_id TEXT NOT NULL,
      payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS presentations_owner ON presentations(owner_id, survey_id);
    CREATE TABLE IF NOT EXISTS presentation_shares (
      presentation_id TEXT PRIMARY KEY REFERENCES presentations(id), owner_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS presentation_assets (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL,
      content TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL
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
    get dialect() {
      return getAuthDatabase() instanceof DatabaseSync ? 'sqlite' : 'postgres';
    },
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
      return transactions.getStore() && !(transactions.getStore() instanceof DatabaseSync)
        ? ' FOR UPDATE'
        : '';
    },
    get collectionLockSuffix() {
      return transactions.getStore() && !(transactions.getStore() instanceof DatabaseSync)
        ? ' FOR SHARE'
        : '';
    },
    async lockOwner(ownerId: string) {
      if (!(getAuthDatabase() instanceof DatabaseSync))
        await query('SELECT pg_advisory_xact_lock(hashtext(?))', [ownerId]);
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
        let started = false;
        try {
          database.exec('BEGIN IMMEDIATE');
          started = true;
          const result = await transactions.run(database, work);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          if (started) database.exec('ROLLBACK');
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
export { schema as applicationSchema };
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
