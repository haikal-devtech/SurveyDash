# Implementation notes

The application remains a separate project in `surveydash-next`; the previous root application and Google Apps Script integration remain separate. The existing Next.js/Better Auth identity and response schema were retained.

Changes are additive. Archived/trash surveys retain their question payload, token, submissions and audit trail. A duplicate gets a new ID/token and starts as a draft with no copied responses. Template reuse never changes its source survey. Derived slide data is recomputed server-side rather than trusting client numbers.

Autosave serializes requests, carries forward the returned revision when edits occur in flight, and keeps later edits pending. Save failures retain local content and provide a retry path. Server-side optimistic versions reject competing stale saves. Undo history does not rewind the server version. Data refresh preserves manual content and geometry.

Presentation export favors visual fidelity across PDF, PPTX and browser rendering. It uses slide images instead of recreating charts/text in PowerPoint; the limitation is disclosed before export. A future native editable exporter must account for font metrics, masks, chart/category limits and transforms before replacing this path.

Preview isolation is mandatory in database selection, not a UI toggle. Backups and actual restore verification occurred before production migration. Better Auth's existing PostgreSQL rate-limit timestamps remain BIGINT; its migration inspection emits a type warning, and live login/rate limiting continued to work. No destructive type conversion was applied.

The master build document remains a roadmap. External integrations need their credentials and business configuration. The implementation report distinguishes available functionality from deferred work. There are no active payment charges, fake invoices or public raw-response dashboards.
