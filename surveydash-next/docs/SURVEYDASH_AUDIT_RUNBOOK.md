# Audit hardening: operation and recovery

Target: `haikal-devtech/SurveyDash`, app root `surveydash-next`, production branch `codex/surveydash-studio`, Vercel project `surveydash-studio`, canonical <https://surveydash-studio.vercel.app>. Default branch `main` contains the older app. Install workflow-only changes there; do not merge the whole Studio branch just to enable a schedule.

## Backup, migrate and release

Verify team/project/environment/commit and pass lint, types, tests, build and dependency audit. Preserve effective authentication, payout and Google encryption keys privately. Changing an encryption key without migration makes existing ciphertext unreadable.

Supply an independent `BACKUP_ENCRYPTION_KEY` (32+ random characters) through protected environment configuration. Keep its recovery copy separate from backup storage. New `.sdb.enc` files use SDB2 AES-256-GCM, streamed JSONL, per-table SHA-256 and row counts in a consistent read-only PostgreSQL snapshot. Every public base table except derived `app_migrations` is discovered; unsupported cyclic dependencies or missing primary keys fail explicitly. Legacy JSON backups still contain private data.

```powershell
node --env-file=.env.cloud.local --import tsx scripts/backup.ts
node --env-file=.env.staging.local --import tsx scripts/migrate.ts staging
node --env-file=.env.cloud.local --import tsx scripts/migrate.ts production
```

Migration requires `MIGRATION_EXPECTED_DATABASE_SHA256`, privately computed from the exact target DSN, and an explicit staging/production argument. It takes a schema lock, applies additive application/Better Auth migrations, compares core counts and records a version. Run staging first, then take a fresh production backup before migrating production. Keys, DSNs, test credentials and backups must never enter Git/chat.

Release the tested commit through the production branch, verify Vercel READY and canonical alias, then run authorized HTTP smoke checks. Baseline rollback code: `050ab28a886b354cfe2184df9620d4c069f62ed1`. Keep additive schema on code rollback. Never overwrite newly collected responses with an old backup.

## Restore rehearsal

Use an explicit empty recovery database, `ALLOW_STAGING_RESTORE=true`, the independent backup key and protected stable application keys. Initialize current schema, then restore:

```powershell
node --env-file=.env.recovery.local --import tsx scripts/setup.ts
node --env-file=.env.recovery.local --import tsx scripts/restore-staging.ts .data/backups/studio-TIMESTAMP.sdb.enc
```

Restore refuses nonempty target tables and verifies authenticated completion, every restored row count and checksum before commit. Bad keys, tampering and truncation roll back. Recovering ciphertext without payout/auth keys cannot recover readable payout values or existing sessions. Test login, ownership and decryption separately on recovery infrastructure.

## CI, backup schedule and monitoring

The checks workflow runs isolated SQLite lint/type/tests/build/audit on PRs and Studio production pushes. The backup workflow runs daily, stores an encrypted GitHub artifact for 90 days, then restores/verifies in an ephemeral PostgreSQL service. It requires repository variable `SURVEYDASH_BACKUP_ENABLED=true`, secrets `SURVEYDASH_BACKUP_DATABASE_URL` (prefer a read-only role) and `SURVEYDASH_BACKUP_ENCRYPTION_KEY`, and installation on the repository default branch. It checks out code from the Studio production branch.

Scheduling/offsite backup is only active after configuration and an actual successful run. Name an operator responsible for failed runs, separate recovery keys and periodic recovery rehearsals. GitHub access controls protect artifacts. Provider PITR/backups have separate recovery/retention procedures; this app snapshot does not replace them.

`/api/health` checks database connectivity and returns 503 for at least 20 recorded unexpected failures in 15 minutes. Admin operations shows sanitized error IDs and configuration flags. `surveydash-health.yml`, on the default branch with `SURVEYDASH_HEALTH_ENABLED=true`, checks every 15 minutes and fails after retried HTTP errors. GitHub Actions failure notifications depend on the operator's account/repository notification settings; delivery is not verified just because a job exists. Provider-level uptime/error alerts remain separately configurable.

## Email and MFA

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` privately on the verified Vercel environment. Remote SMTP requires TLS; 465 uses implicit TLS and 587 STARTTLS. Configure sender DNS/verification at the selected provider. The public contact `help@surveydash.id` does not prove its inbox exists.

`pnpm check:email` verifies connection/authentication without sending mail. Test delivery only to an approved mailbox, then token expiry/single use/session revocation. Enable `PASSWORD_RECOVERY_ENABLED=true` after delivery succeeds. `EMAIL_VERIFICATION_ENABLED=true` sends verification on new signup; existing accounts are not forcibly locked out. Never paste credentials in chat.

Users enroll TOTP themselves in account security and privately retain backup codes. Enrollment requires a successful code. Both manager and surveyor logins must withhold authenticated access before the second factor. Existing accounts are not enrolled automatically. Respondents remain anonymous.

## Operational meaning

- Accepted data requires a valid review matching the current response revision. Raw answers remain. Corrections invalidate old acceptance/weights. Targets may be exceeded.
- Region counts use submission-time task province. Legacy unknown/direct responses remain unknown. Home province is separate from task territory; no GPS, domicile or unique-human inference.
- City/district are manual notes; honor is bookkeeping without transfer. Coordinators cannot read/write honor.
- Final datasets freeze reviewed copies and export CSV. Live charts can change; close collection and document methodology before freezing.
- Retention is manual, default 90 days (configurable 30–3,650). Only owner/admin can purge eligible trash with title, reason and backup acknowledgment. Requests for data are tracked for human handling; account deletion is not automatic.
- Shared-device drafts expire in four hours, ask before recovery and remove answers after success. Browser/network/storage and Office visual checks remain separate QA requirements.

## Measured local benchmark

Synthetic isolated SQLite on 23 October 2026; not a Vercel/PostgreSQL capacity guarantee.

| Rows / questions | Insights | Initial cleaning | Warm cleaning | Presentation create/refresh | Observed RSS |
| --- | --- | --- | --- | --- | --- |
| 20,000 / 14 | 1.85 s | 24.75 s / 40 batches | 2.91 s | 5.33 s | 218 MB |
| 100,000 / 2 | 1.68 s | 129.07 s / 200 batches | 6.01 s | 5.34 s | 261 MB |

Cleaning shows progress and withholds partial flags. Initial scans/grouping need further optimization for tighter latency targets. Define expected responses, questions, concurrency and peaks before claiming national readiness. A PostgreSQL recovery round trip additionally verified all public application/auth tables and 9,000 synthetic rows, then rolled back all fixtures.

An isolated staging PostgreSQL test sent 40 concurrent repository submissions through a four-connection pool: about 5.01 seconds total, p50 2.77 seconds, p95 4.76 seconds, compared with 14.44 seconds before replacing the exclusive collection lock with a shared definition lock. Closing/editing still requires an exclusive lock; quota-enforced collection retains its exact exclusive path. Eight concurrent retries with one key produced one response. This test includes network/database time and excludes HTTP/browser overhead; it is not a national throughput guarantee.
