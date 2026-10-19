# Friendly UI and first-use guides — 20 October 2026

The home page keeps the two roles explicit: Pengelola Survei and Surveyor. Each has a short explanation, Masuk, and Daftar. A separate respondent action opens the public survey directory without authentication. The supplied SurveyDash logo, lavender, violet, cream, and dark ink carry the brand. The user's revised visual direction is Soft Claymorphism + Gradient Design: five compact clay object illustrations replace the initial photography, alongside a static CSS material system. Current asset provenance and prompts are in `CLAY_IMAGE_PROMPTS.md`; implementation and size details are in `SURVEYDASH_SOFT_CLAY.md`.

Login and registration use the same role switch and existing authentication flow. The desktop illustration disappears on smaller screens so the form remains the focus. The manager home puts survey creation first, followed by actual survey/open-survey/response totals, Surveyor and cleaning shortcuts, templates, and existing surveys. The Surveyor portal focuses on tasks, response counts, and a prominent copy-link action. Its empty state explains how to obtain an invitation. Help now has separate three-step guides for managers/SKM and Surveyors, with detailed answers in expandable sections. Respondent forms include a native progress element for required questions and a larger submit button.

## First-use tutorial

The manager and Surveyor shells each mount their own three-step dialog. It automatically opens on the first visit to that role's home when no result exists for the current guide version. This includes an existing account's first visit after the feature becomes available. It does not interrupt editor, profile, or invitation deep links. Users can go back, advance, skip, close, or replay via Panduan singkat / Bantuan. Radix provides dialog keyboard handling and focus containment; explicit focus restoration returns to the launcher. A failed status request never blocks the workspace, and a failed result write offers retry/closing.

`GET /api/account/guide` and `POST /api/account/guide` require a session and return only role, version, and status. POST also validates the request origin and a bounded strict body. Account ID comes from the actual session, including while an admin manages another workspace; role comes from the stored Surveyor profile. A caller cannot choose another account, role, workspace, or version. `account_guides` stores a completed/skipped result with account ID, role, version and timestamp. It contains no answers or bank details. The unique composite key makes repeated saves idempotent. No localStorage account state is used.

Public `/f/[token]` and Surveyor `/r/[token]` forms mount no tutorial and require no login. Existing server validation, privacy notices, and attribution remain in place. The new progress indicator measures filled required inputs; server validation still decides whether submission is valid. No quotas, subscriptions, provider flags, email delivery, or payment services were activated.

## Validation

- All 55 repository/unit tests pass, including five guide tests for new state, persistence across connections, account isolation, actual role, input restrictions, and replay.
- The optimized production build and TypeScript compilation pass. ESLint passes with zero warnings.
- 45 local production-server HTTP checks cover sign-up/sign-in, both roles, guide persistence across sessions, CSRF/auth/input guards, account isolation, invited Surveyor tasks, anonymous direct and referral submissions, attribution, and all ten image assets.
- Four PostgreSQL guide checks verify read, skip, completion, and repeated upsert. Their temporary preference row is removed afterward.
- A staging backup followed by additive setup and a full table hash comparison confirms all 24 existing tables retain identical rows. `account_guides` is the only new table; the ordered empty-target restore includes it.

Browser interaction and desktop/mobile visual QA remain deferred under the user's explicit release choice. Source review and HTTP checks do not establish visual layout, accessibility conformance, Lighthouse scores, or tutorial interaction in a real browser. The earlier saved browser policy denial is respected.

## Release and recovery

Push the tested code to GitHub. Production project remains `surveydash-studio`, production branch `codex/surveydash-studio`, canonical alias `surveydash-studio.vercel.app`. Take a fresh private production backup, apply additive setup, and compare existing rows before release. Keep the previous production commit `d6c79cb9c5e5ce0944e919cb0a4bf93ca92d090c` available for application rollback; the additive guide table can remain. Never restore an older backup over live responses.
