import { getDb } from './db';
import { passwordRecoveryAvailable, smtpConfiguration } from './email';
export async function recordFailure(id: string, route: string, error: unknown) {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const code = /^[A-Z0-9_]{1,40}$/i.test(candidate) ? candidate : '';
  console.error('SurveyDash API failure', { eventId: id, route, name, code });
  try {
    await getDb()
      .prepare('INSERT INTO operation_events VALUES (?, ?, ?, ?, ?)')
      .run(id, route, name.slice(0, 80), code, new Date().toISOString());
    await getDb()
      .prepare('DELETE FROM operation_events WHERE at < ?')
      .run(new Date(Date.now() - 14 * 86400000).toISOString());
  } catch {
    /* Provider logs remain available during a database outage. */
  }
}
export async function operationReadiness() {
  await getDb().prepare('SELECT 1 AS ok').get();
  const keys = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'SURVEYOR_DATA_SECRET',
    'BACKUP_ENCRYPTION_KEY',
    'CRON_SECRET',
  ] as const;
  return {
    database: true,
    passwordRecovery: passwordRecoveryAvailable(),
    smtpComplete: smtpConfiguration() !== null,
    emailVerification: process.env.EMAIL_VERIFICATION_ENABLED === 'true' && passwordRecoveryAvailable(),
    configuration: Object.fromEntries(keys.map((key) => [key, !!process.env[key]])),
    events: await getDb()
      .prepare('SELECT id, route, error_name, code, at FROM operation_events ORDER BY at DESC LIMIT 30')
      .all(),
  };
}
