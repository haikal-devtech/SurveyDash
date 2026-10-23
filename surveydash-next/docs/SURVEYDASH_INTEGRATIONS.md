# SMTP recovery and Google Forms configuration

SMTP and Google services require operator configuration. Set credentials through your environment manager or an ignored local environment file; never put them in Git or chat. `help@surveydash.id` is the approved public contact. Showing that address does not create its mailbox or verify its sending domain.

The audit release adds `pnpm check:email` (connection/authentication only, no message), optional verification on new signup through `EMAIL_VERIFICATION_ENABLED`, and user-enrolled TOTP/backup codes. Production email remains unavailable until a sender service and delivery are configured. See [the audit runbook](SURVEYDASH_AUDIT_RUNBOOK.md). CSV/XLSX also respect the selected raw/accepted dataset and date/province/surveyor filters, and include revision-valid manual weights; XLSX records the applied dataset/filter metadata.

## Password recovery

Use a provider that supplies authenticated SMTP and permits your verified sender. Set these server variables using `.env.example` as a reference:

| Variable                     | Value                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `SUPPORT_EMAIL`              | `help@surveydash.id`                                     |
| `SMTP_HOST`                  | Provider SMTP hostname                                   |
| `SMTP_PORT`                  | `587` for STARTTLS or `465` for implicit TLS             |
| `SMTP_USER`, `SMTP_PASSWORD` | Provider credentials, stored privately                   |
| `SMTP_FROM`                  | Verified sender address, normally `help@surveydash.id`   |
| `PASSWORD_RECOVERY_ENABLED`  | Keep `false` until delivery is verified; then set `true` |
| `BETTER_AUTH_URL`            | Canonical application URL for this environment           |

Configure the provider's required DNS records and verify the domain/sender before enabling delivery. TLS certificate verification remains enabled. `SMTP_TEST_MODE=true` permits plaintext only to loopback hosts outside production; omit it in hosted environments.

Redeploy/restart after configuration. Test with a dedicated QA account: request recovery, check inbox/spam, open the link, change the password, confirm the old password and old sessions fail, and confirm reuse of the link fails. Unknown accounts receive the same generic public response. Tokens expire in 30 minutes. Delivery failures are logged without credentials or token URLs; do not claim success based solely on the generic response. Monitor delivery in your provider as well.

Local verification used a real ephemeral SMTP capture: delivery, escaped names, single-use token, password replacement and session revocation passed. Production delivery, sender DNS and deliverability have not been tested. This is password recovery only; signup email verification and team invitations remain deferred.

Implementation uses [Nodemailer SMTP](https://nodemailer.com/smtp) and [Better Auth password recovery](https://better-auth.com/docs/authentication/email-password). Nodemailer is MIT-0; license text is retained in `public/licenses`.

## Google Forms

1. In your Google Cloud project enable the Google Forms API and configure the OAuth consent screen, application details and allowed test users.
2. Create a Web application OAuth client. Register the exact redirect URI `<application-origin>/api/integrations/google-forms/callback`. Preview URLs have their own origin; register the preview URI explicitly. Do not reuse a production redirect to test preview.
3. Configure server-only `GOOGLE_FORMS_CLIENT_ID` and `GOOGLE_FORMS_CLIENT_SECRET`, plus the existing strong `BETTER_AUTH_SECRET`. Run the additive setup migration before enabling the connector.
4. Complete any Google consent/scope verification applicable to the deployment. In testing mode, use the approved test users.
5. Open Studio → **Impor Google Form → Sambungkan Google**. Paste an authorized form's editor URL or ID, keep **Sertakan jawaban responden** checked, review the question/response counts and warnings, then choose **Impor sebagai survei baru**. Existing connections must use **Perbarui izin** to grant response access. Questions-only import remains available by unchecking the response option.

The requested scopes are `https://www.googleapis.com/auth/forms.body.readonly` and `https://www.googleapis.com/auth/forms.responses.readonly`. The connector reads the form definition through the [Forms GET API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/get) and all response pages through the [Forms responses API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list). It does not modify the Google source. A responder link is not accepted as an editor link. This connector does not introduce Google login or replace existing Better Auth accounts.

The import is a one-time snapshot, creating a **new custom, private draft**, never merging into an existing survey or automatically publishing. Historical response IDs, creation/last-submission timestamps, collected emails, and original answer resources are preserved privately. Supported answers are matched by Google question IDs and exact option labels. Unknown/Other values, unsupported grids, dates that cannot be interpreted safely, and deleted question answers remain in the private source metadata with a warning; they are not invented as public options or included in charts as if mapped. Attachments are not downloaded. No SKM score or surveyor attribution is inferred. Required fields absent from historical records remain empty.

Limits: 100 form items, 10,000 responses, and 10 MB across Google pages; local JSON upload is limited to 4.4 MB. Exceeding a bound or failing a page aborts the operation rather than silently importing a partial history. JSON fallback accepts a Form resource alone or `{ "form": <Form resource>, "responses": [<FormResponse>, ...] }`; a response must have its original responseId and createTime. Google Sheets/CSV alone cannot reconstruct all original question types, IDs, branching or timestamps reliably and are not accepted as equivalent Form resources.

Previews are encrypted in `form_import_batches`, bound to the authenticated actor and selected workspace, valid for 15 minutes, and cleaned lazily at the next preview. At most three pending previews are retained per actor/workspace during sequential use. Commit runs in one transaction, imports submission/source rows in batches of 100, and clears the staged payload. A 24-hour receipt makes retries return the same survey; after expiry, starting another import deliberately creates another survey. `submission_import_sources` retains the raw source, provider and importing actor. Backup discovers these additive tables automatically; empty-staging restore includes them. Back up production before migration; no existing survey or response is rewritten.

Credentials are encrypted in `google_form_connections` and never returned to the browser. The actual logged-in account owns the connection even during admin workspace switching. Changing `BETTER_AUTH_SECRET` requires users to reconnect. Backups containing encrypted credentials remain private. Disconnect deletes locally stored credentials; users can separately revoke consent in their Google Account.

PKCE, scopes, state expiration/tampering/ownership, form-ID validation, mocked pagination, historical answer mapping, transactional rollback, owner/actor isolation, expiry, and duplicate-commit protection are tested. The real Google consent/token exchange requires provider credentials and remains unverified. The official [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) is Apache-2.0; its license is retained in `public/licenses`.

## Excel and Google Sheets

Open a survey → **Data → Unduh data → Excel (.xlsx)** or **CSV (.csv)**. The download respects the current search and sort and includes all matching rows across pages, regardless of hidden table columns. Both formats can be uploaded to Google Sheets; this is a file export, not live Sheets synchronization. Export endpoints remain workspace/manager protected, with no-store headers.

Excel uses the server-only MIT-licensed [ExcelJS](https://github.com/exceljs/exceljs) streaming writer (license in `public/licenses/exceljs-LICENSE.txt`). The **Jawaban** sheet has frozen headers, filters, actual numeric cells and explicit WIB (UTC+7) date cells. Text answers, including bank numbers with leading zeros and strings starting with `=`, stay literal text. The **Informasi** sheet explains time and filters. **Data asli** sheets preserve imported response JSON, split into numbered chunks below Excel's cell limit without discarding unknown answers. The raw import source can contain personal data and should only be shared with authorized recipients. CSV includes the raw JSON and uses formula neutralization. XLSX testing loads generated files to verify types, source data, dates, filters and pagination; browser download interaction/visual QA and real Google consent remain separate checks.

## Validation — 21 October 2026

- Full automated suite: 75 passed. The new `tests/form-import-export.test.ts` covers mapping, unknown answers, no public PII options, historical time, expiry, actor/owner isolation, transaction rollback, concurrent retry, XLSX cell types, filters, paging, cancellation and mocked Google pagination. Google OAuth tests assert both read-only scopes.
- Isolated application HTTP check: 24 passed, importing 105 historical responses into one new private draft, retrying without duplication, downloading and opening actual XLSX/CSV results, and enforcing authentication, origin and role/owner guards. Existing dashboard/respondent HTTP regression: 47 passed; CSS delivery: 17 passed.
- PostgreSQL staging: a temporary schema verified the additive tables, bulk import of 121 responses, advisory/row locking, concurrent commit idempotency and XLSX streaming; the temporary schema was removed afterward. No production survey/response test writes were made.
- ESLint and optimized Next build passed. React review preserved guided-tour controls, stable question/option IDs, post-response schema locks and server-only Excel dependencies. Desktop/mobile browser interactions and visual layout remain unverified because the saved browser policy denies access; no workaround or performance/accessibility score is claimed.
- Production database backup was taken before release. Google client/secret are absent in the local production configuration; real provider consent, token exchange and Google API integration require operator setup and a separate live check.

## Spreadsheet reconstruction follow-up

File upload supports up to 4,400,000 bytes, with a 4,450,000-byte API request ceiling below the hosting payload limit. These browser-safe constants are shared without importing the server parser into the client bundle. A JSON bundle marked `sourceKind: "google-sheets"` always requires review of a static reconstruction warning before commit. Reconstructed spreadsheet data must preserve original text, use a confirmed timezone, and distinguish synthetic row IDs from actual Google Forms response IDs. It must not infer question choices, branching, required flags, SKM scores, or authenticated surveyor attribution.

A private user-provided spreadsheet was converted and tested in an isolated local database: 1,236 response rows, 52 retained question columns, 57,848 nonempty source cells checked exactly, WIB timestamps preserved, and retry verified without duplication. Two unnamed entirely empty columns were omitted. The approximately 4.25 MB JSON fits the adjusted upload bound. Source data, generated JSON, credentials, and local database artifacts remain ignored and are excluded from Git/deployments. The source spreadsheet and production survey/response records were not edited.
