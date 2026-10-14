# Route map

Public routes: `/`, `/features`, `/pricing`, `/help`, `/contact`, `/privacy`, `/terms`, `/login`, `/surveys`, `/f/[token]`, opt-in presentation viewer `/p/[token]`, `/robots.txt`, `/sitemap.xml`.

Owned workspace routes: `/studio`, `/studio/surveys`, `/studio/templates`, `/studio/search`, `/studio/import`, `/studio/[id]`, `/studio/[id]/presentations/[presentationId]`, `/studio/settings`, and settings subpages `account`, `workspace`, `membership`, `billing`.

All workspace routes require a Better Auth session. Survey, template, presentation and image queries also constrain `owner_id`; guessing a resource ID does not grant access. Anonymous form access is controlled independently by token, publication status and visibility. Archived and trashed surveys stop accepting responses.

APIs: auth `/api/auth/[...all]`; owned surveys `/api/surveys`, `/api/surveys/[id]`, `/manage`, explicit demo `/api/surveys/demo`; public form `/api/forms/[token]`; template CRUD `/api/templates`, `/api/templates/[id]`, `/apply`; slide documents `/api/presentations`, `/api/presentations/[id]`, `/template`; images `/api/assets`, `/api/assets/[id]`; workspace `/api/workspace`; Google resource JSON import `/api/import/forms`.

Presentation sharing: owned `/api/presentations/[id]/share` supports status, reviewed publication and revocation. Anonymous `/api/shared/[token]` returns only a frozen slide snapshot; `/api/shared/[token]/assets/[id]` serves only images referenced by that snapshot. The viewer is excluded from indexing and uses no-store/no-referrer headers. Archive and survey trash revoke links; restoring does not reactivate them. Team administration endpoints remain unavailable.
