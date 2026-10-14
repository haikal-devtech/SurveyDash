# Revision validation — 14 October 2026

Branch: `codex/surveydash-revisions`, based on `1dad32e76e68b68a1f6f0d5e8ea645b7ddeeb271`. This report concerns the follow-up revision, not the older browser screenshots in the implementation report.

## Verified behavior

| Check                            | Result              | Evidence scope                                                                                                                                                               |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository/model/security tests  | 28 passed, 0 failed | Temporary SQLite, actual SMTP capture, OAuth PKCE/encryption/state validation                                                                                                |
| Revision HTTP smoke              | 24 passed           | 48 responses as 15/15/15/3; full CSV, lightweight SSR/metadata; SMTP reset, single-use token, old password/session rejection; Google unavailable/callback denial             |
| Avatar HTTP smoke                | 16 passed           | Private 128px WebP; anonymous/cross-owner denial; SVG/origin rejection; actual profile identity retained when admin selects another workspace                                |
| Existing survey HTTP regression  | 26 passed           | Form, public submission, idempotency, correction/audit, templates, presentations and JSON import                                                                             |
| Existing sharing HTTP regression | 38 passed           | Explicit publication/review, frozen version, revoke, archive/restore; test links revoked                                                                                     |
| PostgreSQL smoke                 | 18 passed           | Temporary schema on staging: pagination, label/literal search, numeric/empty sorting, unusual question IDs, all-result CSV, insights and transactional presentation creation |
| TypeScript and lint              | Passed              | Strict source checks; ignored local QA artifacts excluded                                                                                                                    |
| Production build                 | Passed              | Next.js optimized build and 27 static pages; initialized isolated build database                                                                                             |
| Frozen dependency install        | Passed              | pnpm frozen-lockfile offline install; exact new dependency versions and retained licenses                                                                                    |

Private machine-readable reports are kept in ignored `test-results/`: `revisions-http-smoke.json`, `avatar-http-smoke.json`, `http-smoke.json`, `sharing-smoke.json`, `postgres-revisions-smoke.json`. The sharing report records 35 checks before its three cleanup requests; final stdout confirms all 38 passed. Passwords and raw captured recovery email remain in ignored local fixtures; they are not release artifacts. PostgreSQL temporary schema was removed. No production data migration or password reset was performed for this revision.

Staging was backed up before its additive migration. All rows across all 15 existing tables compared equal afterward: 29 surveys, 201 submissions, 8 audit records, 14 templates, 6 users/accounts, 14 presentations and the remaining auth/assets/settings records. The new connection table and submission index were confirmed. Preservation evidence is in ignored `staging-revision-preservation.json`. Existing Better Auth migration warns about the PostgreSQL `rateLimit.lastRequest` int8 type; no rows changed and HTTP flows passed.

## Outstanding release gates

- The user authorized local browser preview, but the tool still rejects the local origin because of saved permission or managed policy. No workaround browser was used. Responsive/visual/browser-interaction QA and Lighthouse remain unverified for this revision.
- SMTP configuration is prepared; production sender ownership/DNS and inbox delivery have not been tested. `PASSWORD_RECOVERY_ENABLED` stays false by default.
- Google Forms API client/secret, consent configuration and applicable provider verification are not available. Real authorization/token exchange remains unverified. JSON import remains available.
- Teams/invitations, paid subscriptions/merchant setup, XLSX export and full preferences remain deferred. Server analytics still load all responses; server pagination removes that requirement from the Data browser view only.

The code is reviewable on its revision branch. Production must wait for the visual gates; optional integrations remain disabled until their provider checks pass.
