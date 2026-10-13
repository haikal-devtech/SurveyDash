# Route map

Public routes: `/`, `/features`, `/pricing`, `/help`, `/contact`, `/privacy`, `/terms`, `/login`, `/surveys`, `/f/[token]`, `/robots.txt`, `/sitemap.xml`.

Owned workspace routes: `/studio`, `/studio/surveys`, `/studio/templates`, `/studio/search`, `/studio/import`, `/studio/[id]`, `/studio/[id]/presentations/[presentationId]`, `/studio/settings`, and settings subpages `account`, `workspace`, `membership`, `billing`.

All workspace routes require a Better Auth session. Survey, template, presentation and image queries also constrain `owner_id`; guessing a resource ID does not grant access. Anonymous form access is controlled independently by token, publication status and visibility. Archived and trashed surveys stop accepting responses.

APIs: auth `/api/auth/[...all]`; owned surveys `/api/surveys`, `/api/surveys/[id]`, `/manage`, explicit demo `/api/surveys/demo`; public form `/api/forms/[token]`; template CRUD `/api/templates`, `/api/templates/[id]`, `/apply`; slide documents `/api/presentations`, `/api/presentations/[id]`, `/template`; images `/api/assets`, `/api/assets/[id]`; workspace `/api/workspace`; Google resource JSON import `/api/import/forms`.

No public presentation viewer or team administration endpoints are enabled in this release. PDF/PPTX downloads are the available presentation sharing path.
