# Architecture — audit hardening, 23 October 2026

Next.js 16 App Router, React 19, TypeScript, Radix, TanStack Table and Recharts. Better Auth handles email/password, optional TOTP/backup codes and SMTP-dependent verification/recovery. Respondents need neither login nor tutorials.

PostgreSQL through `pg` serves production. Vercel previews require a separate `STAGING_DATABASE_URL`; absent configuration fails closed. SQLite is local/test only. The explicit cloud migration takes an advisory schema lock, applies additive app/auth migrations, checks core counts and records its version. Schema migration is not part of request/build handling.

## Access

Accounts are managers or surveyors; platform admins are explicitly granted immutable IDs. Every workspace request validates the cookie against active membership/admin access. Writes additionally require `x-studio-workspace` to match the owner expected by the page. Stale tabs and revoked memberships receive 409 instead of silently writing into a fallback workspace. `workspaceFetch` attaches context only to scoped requests; account/public routes have separate boundaries.

Owners manage members/retention; editors manage survey/data/presentations/honor; viewers read; coordinators use team, cleaning and fieldwork without response exports or payment data. Backend guards enforce roles independently of buttons. Surveyors only receive assigned surveys, read-only questions, per-survey counts and attributed referral links. Payout profiles are encrypted and omitted from public/map DTOs.

## Collection and quality

Stable question/option IDs, question snapshots, optimistic revisions and retry keys preserve meaning. Conditional rules refer only to earlier questions. The server discards hidden answers and validates required visible fields. Device-reported start/duration is untrusted metadata, not proof of presence/identity/fraud.

Versioned drafts expire in four hours and default to session storage per tab. Persistence across tab closure is opt-in. Recovery asks whether to continue or start empty. Success replaces answers with a receipt and keeps the retry key; a new respondent gets a fresh key. Actual browser storage/network behavior needs browser QA.

New responses snapshot task province in `submission_regions`. Task changes affect future submissions only. Legacy/direct unknown records remain unknown. Home province is separate; mapped counts do not establish respondent domicile/GPS or unique humans.

Cleaning decisions are revision-bound and audited: unreviewed, valid (accepted), needs verification, excluded. Accepted datasets require a current matching valid review. Corrections invalidate prior review and weights; raw responses remain. Workspace/platform blocks have reason, actor and time, disable scoped tasks and prevent reassignment/invitation acceptance. Unblocking requires explicit task reactivation, which rotates the link.

## Analysis and finalization

Response pages and legacy survey GET return at most 100 rows; metadata-only requests omit rows. CSV/XLSX stream filtered rows and record dataset/filter/manual weight metadata. Analytics/presentation refresh use keyset batches and bounded accumulators. Cleaning builds private hashed similarity keys 500 rows per request; only after completion does SQL group/filter/page candidates. Initial indexing remains relatively slow at 100,000 rows; national-cloud capacity is not established.

Cross-tabs support single-choice/rating pairs, raw counts, optional manual weighted sums and explicit denominators. SKM retains nine-element unweighted scoring; missing answers never become score one. No automatic representativeness or margin of error is inferred. Closed surveys can freeze immutable question definitions, chosen responses, attribution, region and revision-valid weights with method notes. Frozen CSV does not change after source corrections.

## Presentations, import and sharing

Versioned slide JSON drives the common DOM renderer for canvas, preview and raster exports. PDF/raster PPTX preserve appearance; editable PPTX uses native Office text/shapes/charts/tables, with possible font/layout differences. Conflicts offer draft download or explicit discard/load latest.

Sharing is explicit and publishes a reviewed frozen snapshot under a random capability token. Private responses/bindings are excluded. Only published assets are accessible through the token. Revoke/archive/trash invalidate links; restore keeps them revoked. Downloaded copies cannot be recalled.

Google Forms uses read-only body/response scopes, encrypted server credentials and previewed imports. JSON/response-sheet import creates a new survey without altering the source. Provider credentials/consent remain external prerequisites; see [integrations](SURVEYDASH_INTEGRATIONS.md).

## Operations and governance

Fieldwork and manual honor records are separate; no transfer occurs. City/district are operator notes, not an official region catalog. Unified activity captures key survey, assignment, target, invitation, membership, review, weight, freeze and retention changes with the actual actor.

Unexpected API failures have sanitized event IDs/static route names; admin readiness does not reveal secret values. `/api/health` checks database access. SMTP delivery, scheduled backup and external alerts require independent verification.

Retention defaults to 90 days, configurable 30–3,650, with no automatic deletion timer. Permanent purge requires eligible trash, exact title, backup acknowledgment, reason and owner/admin authority. Frozen copies are removed with the survey; account/shared assets/backups follow separate lifecycles. Data requests are tracked for operator review rather than automatic account deletion.

Backups stream all public app/auth base tables except derived migration records in one consistent snapshot. AES-GCM plus table hashes/counts are verified before batched restore commits into an empty target. Stable payout/auth keys and an independent backup key must be kept in protected recovery storage. See [runbook](SURVEYDASH_AUDIT_RUNBOOK.md).
