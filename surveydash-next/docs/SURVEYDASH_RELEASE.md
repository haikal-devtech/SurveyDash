# Release and recovery

## Home and subscription update — 20 October 2026

The requested public home has two short role cards. Plan navigation, the sidebar plan/upgrade card, settings membership/billing links and the pricing sitemap entry are removed; old pricing/membership/billing URLs receive temporary redirects. Usage accounting and optional server capacity checks remain internal and unchanged. No schema migration is needed for this UI update.

The canonical production deployment was verified as `dpl_5HZifQkV6Upu7oq4sR4Vpr5cUHZF`, commit `1dad32e76e68b68a1f6f0d5e8ea645b7ddeeb271` on `codex/surveydash-studio`. It still serves the previous public home. The `codex/surveyor-workflow` preview branch includes the revision and Surveyor changes; pushing it does not update the production alias. A full production rollout therefore also needs the previously documented additive schemas, a fresh private production backup/preservation check, and the outstanding visual release gate. Production has not been migrated or released by this update. The current main URL is not a client-cache diagnosis.

## Existing release runbook

Production project: `surveydash-studio`; canonical URL https://surveydash-studio.vercel.app. GitHub repository `haikal-devtech/SurveyDash`, app root `surveydash-next`, production branch `codex/surveydash-studio`. Product development uses `codex/surveydash-product` previews.

Required environment names: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUST_PROXY`. Preview additionally requires `STAGING_DATABASE_URL`. Optional quotas: `ENFORCE_FREE_LIMITS`, `FREE_RESPONSE_LIMIT`, `FREE_ACTIVE_SURVEY_LIMIT`. Public contact: `SUPPORT_EMAIL`, defaulting to the approved `help@surveydash.id`. Optional recovery: `PASSWORD_RECOVERY_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Optional Forms OAuth: `GOOGLE_FORMS_CLIENT_ID`, `GOOGLE_FORMS_CLIENT_SECRET`. Configuration procedures and verification gates are in `SURVEYDASH_INTEGRATIONS.md`. Values are private; `.env*`, `.data/`, credentials and test results are ignored by Git.

Provisioned free Prisma Postgres databases: production `surveydash-studio-db`; preview `surveydash-studio-staging`, Singapore. The staging integration injects prefixed credentials only into Preview. Keep deployment protection enabled for previews. Production custom alias remains publicly accessible with application-level admin authentication.

Backup: `node --env-file=.env.cloud.local --import tsx scripts/backup.ts`. Backups contain private response and authentication data. Restrict their access and do not commit them. A consistent read-only snapshot was created before this release. Original counts: 12 surveys, 147 submissions, 3 audit records, 1 template, 4 users and 4 accounts.

Staging restore: initialize an empty staging database with `scripts/setup.ts`, then run `scripts/restore-staging.ts` using the staging environment and an explicit backup path. `ALLOW_STAGING_RESTORE=true` is required. The restore refuses nonempty target tables and compares every restored row before committing. An actual restore was verified against the pre-release snapshot.

Migration: run `node --env-file=.env.cloud.local --import tsx scripts/setup.ts` only after staging checks pass. Schema changes create new tables/indexes and do not drop or rewrite existing data. Verify preservation using `scripts/verify-data.ts <backup-path>`; review legitimate user edits separately from missing rows.

Release gates: strict ESLint, TypeScript, unit/repository tests, production build, local UI and HTTP flows against staging, preview readiness and production smoke tests. Use `scripts/smoke-http.mjs` with the ignored dedicated test-account file. It creates labeled QA fixtures and archives forms/templates when finished. Do not substitute a real user's account. Preview smoke tests also verify the staging database isolation.

Sharing release additionally uses `scripts/smoke-sharing.mjs`: anonymous access, frozen/reviewed publication, version conflicts, private-response exclusion, revoke/token rotation, archive/restore and survey trash/restore. It creates synthetic QA data, revokes all test links and archives its fixtures. `presentation_shares` is an additive migration and is included in the ordered empty-target restore.

Rollback: redeploy the last stable Git commit `93f768181c077fe31d09f4a49465168d00b25887` or restore its Vercel deployment. Keep the additive tables in place; old code ignores them. Do not restore a historical backup over a live production database because that would discard newer responses. Inspect incidents and restore to a new isolated database first.

No paid plan, renewal, checkout or third-party billing agreement was activated. Subscription and usage promotion UI is now hidden. Internal optional quotas are disabled by default until operational limits are explicitly configured.

Admin provisioning is an explicit operator action: `scripts/provision-access.ts <staging|production> <approved-admin-email> ...`. It grants roles by account ID, preserves existing passwords, and writes generated credentials only to ignored `test-results/client-credentials.json`. It provisions a separate client demo workspace; no production responses are copied. Never run it from a build hook or commit credential files. `scripts/smoke-access.ts` only runs with the staging-only guard and removes its temporary QA role.

## Master brief revision release hold

The current revision branch is `codex/surveydash-revisions`. Run setup against staging before deploying code with the connector enabled: it creates `google_form_connections` and `submissions_survey_order`, without rewriting answers or auth tables. The ordered empty-target restore now includes encrypted Google credentials. Take a fresh private backup before any production migration. Keep the prior production code at `1dad32e76e68b68a1f6f0d5e8ea645b7ddeeb271` available for rollback; additive schema can remain in place.

Local tests use an isolated SQLite database and local SMTP capture, never a customer's account. PostgreSQL query checks use a dedicated temporary schema on staging and remove it afterward without altering public staging tables. Full results are recorded in `SURVEYDASH_REVISION_VALIDATION.md`.

Production release is held because current visual browser QA is denied by a saved permission or managed policy despite human authorization. Complete desktop/mobile layout, inspector drag/resize, menu keyboard/focus, recovery screens, avatar upload and import wizard checks before production. No current Lighthouse or WCAG score is claimed. Provider delivery and real Google consent/token flow need configuration and separate verification before their flags are enabled. Teams and billing remain deferred; no charge or email service purchase was made.
