# SMTP recovery and Google Forms configuration

Code is prepared on `codex/surveydash-revisions`. These services are not configured on production. Set credentials through your environment manager or an ignored local environment file; never put them in Git or chat. `help@surveydash.id` is the approved public contact. Showing that address does not create its mailbox or verify its sending domain.

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
5. Open Studio → Import → Sambungkan Google. Paste an authorized form's editor URL or ID, review mapped questions and unsupported items, acknowledge warnings, then create the new SurveyDash draft.

The only requested scope is `https://www.googleapis.com/auth/forms.body.readonly`. The connector reads the form definition through the [official Forms GET API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/get). It neither imports old responses nor changes the Google source. A responder link is not accepted as an editor link. This connector does not introduce Google login or replace existing Better Auth accounts.

Credentials are encrypted in `google_form_connections` and never returned to the browser. The actual logged-in account owns the connection even during admin workspace switching. Changing `BETTER_AUTH_SECRET` requires users to reconnect. Backups containing encrypted credentials remain private. Disconnect deletes locally stored credentials; users can separately revoke consent in their Google Account.

PKCE, scope, state expiration/tampering/ownership and form-ID validation are covered by automated tests. The real Google consent/token exchange requires provider credentials and has not been exercised. Keep the existing JSON import available until that flow is verified. The official [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) is Apache-2.0; its license is retained in `public/licenses`.
