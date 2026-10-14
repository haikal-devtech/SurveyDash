# Route map

Public routes: `/`, `/features`, `/pricing`, `/help`, `/contact`, `/privacy`, `/terms`, `/login`, `/forgot-password`, `/reset-password`, `/surveys`, `/f/[token]`, opt-in presentation viewer `/p/[token]`, `/robots.txt`, `/sitemap.xml`. Recovery pages are excluded from indexing; reset pages use no-referrer/no-store headers and require a valid Better Auth token.

Owned workspace routes: `/studio`, `/studio/surveys`, `/studio/templates`, `/studio/search`, `/studio/import`, `/studio/[id]`, `/studio/[id]/presentations/[presentationId]`, `/studio/settings`, and settings subpages `account`, `workspace`, `membership`, `billing`.

All workspace routes require a Better Auth session. Survey, template, presentation and image queries also constrain `owner_id`; guessing a resource ID does not grant access. Anonymous form access is controlled independently by token, publication status and visibility. Archived and trashed surveys stop accepting responses.

APIs: auth `/api/auth/[...all]`; owned surveys `/api/surveys`, `/api/surveys/[id]`, `/manage`, explicit demo `/api/surveys/demo`; public form `/api/forms/[token]`; template CRUD `/api/templates`, `/api/templates/[id]`, `/apply`; slide documents `/api/presentations`, `/api/presentations/[id]`, `/template`; images `/api/assets`, `/api/assets/[id]`; workspace `/api/workspace`; Google resource JSON import `/api/import/forms`.

Presentation sharing: owned `/api/presentations/[id]/share` supports status, reviewed publication and revocation. Anonymous `/api/shared/[token]` returns only a frozen slide snapshot; `/api/shared/[token]/assets/[id]` serves only images referenced by that snapshot. The viewer is excluded from indexing and uses no-store/no-referrer headers. Archive and survey trash revoke links; restoring does not reactivate them. Team administration endpoints remain unavailable.

Explicit platform admin: `/studio/admin` and `/api/admin/workspaces`. Only designated account IDs can list/select other workspaces; normal owners retain full features in their own isolated workspace. Account profile routes always refer to the signed-in user.

Revision APIs: `/api/surveys/[id]/responses` returns a bounded server page or streamed CSV (`format=csv`); `/api/surveys/[id]/insights` returns statistical summaries, with capped text samples only when `samples=true`. `/api/surveys/[id]?view=metadata` omits submissions/audit; the default response remains compatible with older clients. All three use selected-workspace ownership.

`/api/account/avatar` uploads and serves private profile images for the actual logged-in user. `/api/integrations/google-forms` reads connection status, starts OAuth, previews an authorized Form or disconnects local credentials. `/api/integrations/google-forms/callback` validates the owner, encrypted state and PKCE exchange. Mutations check the request origin; provider configuration is required. Admin workspace selection does not change Google/profile identity.
