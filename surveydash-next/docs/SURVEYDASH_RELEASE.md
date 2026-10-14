# Release and recovery

Production project: `surveydash-studio`; canonical URL https://surveydash-studio.vercel.app. GitHub repository `haikal-devtech/SurveyDash`, app root `surveydash-next`, production branch `codex/surveydash-studio`. Product development uses `codex/surveydash-product` previews.

Required environment names: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUST_PROXY`. Preview additionally requires `STAGING_DATABASE_URL`. Optional quotas: `ENFORCE_FREE_LIMITS`, `FREE_RESPONSE_LIMIT`, `FREE_ACTIVE_SURVEY_LIMIT`. Optional contact address: `SUPPORT_EMAIL`. Values are private; `.env*`, `.data/`, credentials and test results are ignored by Git.

Provisioned free Prisma Postgres databases: production `surveydash-studio-db`; preview `surveydash-studio-staging`, Singapore. The staging integration injects prefixed credentials only into Preview. Keep deployment protection enabled for previews. Production custom alias remains publicly accessible with application-level admin authentication.

Backup: `node --env-file=.env.cloud.local --import tsx scripts/backup.ts`. Backups contain private response and authentication data. Restrict their access and do not commit them. A consistent read-only snapshot was created before this release. Original counts: 12 surveys, 147 submissions, 3 audit records, 1 template, 4 users and 4 accounts.

Staging restore: initialize an empty staging database with `scripts/setup.ts`, then run `scripts/restore-staging.ts` using the staging environment and an explicit backup path. `ALLOW_STAGING_RESTORE=true` is required. The restore refuses nonempty target tables and compares every restored row before committing. An actual restore was verified against the pre-release snapshot.

Migration: run `node --env-file=.env.cloud.local --import tsx scripts/setup.ts` only after staging checks pass. Schema changes create new tables/indexes and do not drop or rewrite existing data. Verify preservation using `scripts/verify-data.ts <backup-path>`; review legitimate user edits separately from missing rows.

Release gates: strict ESLint, TypeScript, unit/repository tests, production build, local UI and HTTP flows against staging, preview readiness and production smoke tests. Use `scripts/smoke-http.mjs` with the ignored dedicated test-account file. It creates labeled QA fixtures and archives forms/templates when finished. Do not substitute a real user's account. Preview smoke tests also verify the staging database isolation.

Sharing release additionally uses `scripts/smoke-sharing.mjs`: anonymous access, frozen/reviewed publication, version conflicts, private-response exclusion, revoke/token rotation, archive/restore and survey trash/restore. It creates synthetic QA data, revokes all test links and archives its fixtures. `presentation_shares` is an additive migration and is included in the ordered empty-target restore.

Rollback: redeploy the last stable Git commit `93f768181c077fe31d09f4a49465168d00b25887` or restore its Vercel deployment. Keep the additive tables in place; old code ignores them. Do not restore a historical backup over a live production database because that would discard newer responses. Inspect incidents and restore to a new isolated database first.

No paid plan, renewal, checkout or third-party billing agreement was activated. Actual Free beta usage is shown. Quotas are disabled by default until business limits are explicitly configured.
