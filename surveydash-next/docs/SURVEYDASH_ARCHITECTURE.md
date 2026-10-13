# Architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix dialogs, TanStack Table and Recharts. Better Auth handles email/password sessions; the attached brief's Auth.js assumption did not match the existing implementation, so authentication was preserved.

Production uses Prisma Postgres through `pg` in Singapore. SQLite is the development/test fallback. Preview deployments must use `STAGING_DATABASE_URL`; missing staging configuration fails closed. They never fall back to the production database. Local staging uses an ignored `.env.staging.local` with the same cloud staging database.

Tables retain their existing data: `surveys`, `submissions`, `audit`, `templates`, Better Auth tables and rate limits. New additive tables are `workspace_settings`, `presentations` and `presentation_assets`. Survey metadata and versioned presentation documents are JSON stored as TEXT. No response or authentication table was replaced.

Responses preserve question snapshots, stable option IDs, optimistic revisions and idempotency keys. SKM uses exactly nine scored elements and per-element valid-answer denominators. Missing answers are not converted to a score of one. Corrections append audit entries. All mutations check sessions, origins, ownership and payload limits. Optional quotas use an owner transaction lock, apply to opening forms and accepting new responses, and retain existing data.

Templates support form, one-page presentation layout and complete survey packages. Slide templates additionally store `slidePreset`: design, image references and source-question bindings. Derived chart counts and bound metric text are removed before saving. Reuse creates a new document with new element/slide IDs, maps compatible destination questions and recalculates from destination responses. Manual text/images remain intentionally reusable; users are asked to review personal information.

Slide rendering uses a shared DOM renderer for canvas, preview and exports. Data binding refresh replaces only bound numbers/distributions and preserves manual edits and layout. Saves reject stale versions and inaccessible assets. Uploaded PNG/JPG/WebP images are bounded, decoded with Sharp, normalized to WebP and stored durably in the owned database. SVG and animated uploads are rejected.

PDF and PowerPoint export use the same 16:9 slide renderer at 1920 × 1080 pixels. PPTX contains one slide image per page; its individual text/chart components are not editable in PowerPoint. The Studio source document remains editable. PDF pages also contain images, so text search and screen-reader text extraction are not supported in these exports.

Google import accepts the official resource Form JSON shape, validates supported question types and requires acknowledgment of unsupported items. It does not scrape Google, request tokens, import responses or alter the original Google Form. OAuth, SMTP, payment checkout, multi-user collaboration and platform admin roles are not configured in this release.
