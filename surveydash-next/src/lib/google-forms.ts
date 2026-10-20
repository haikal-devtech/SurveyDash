import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { OAuth2Client, CodeChallengeMethod, type Credentials } from 'google-auth-library';
import { z } from 'zod';
import { getDb } from './db';
import { AppError } from './repository';
import { authBaseUrl } from './origins';
import { parseFormsImport } from './forms-import';
import { MAX_IMPORT_BYTES, MAX_IMPORT_RESPONSES } from './form-responses-import';

export const GOOGLE_FORMS_SCOPE = 'https://www.googleapis.com/auth/forms.body.readonly';
export const GOOGLE_FORMS_RESPONSES_SCOPE = 'https://www.googleapis.com/auth/forms.responses.readonly';
export const GOOGLE_FORMS_STATE_COOKIE = 'surveydash_google_forms_state';
export const GOOGLE_FORMS_CALLBACK_PATH = '/api/integrations/google-forms/callback';
export function googleFormsConfigured() {
  return !!(
    process.env.GOOGLE_FORMS_CLIENT_ID &&
    process.env.GOOGLE_FORMS_CLIENT_SECRET &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_SECRET.length >= 32
  );
}
function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new AppError('Sambungan Google belum dikonfigurasikan.', 503);
  return createHash('sha256')
    .update('surveydash-google-forms:' + secret)
    .digest();
}
export function sealGooglePayload(
  userId: string,
  purpose: 'state' | 'credentials' | 'import',
  value: unknown,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(purpose + ':' + userId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}
export function openGooglePayload(
  userId: string,
  purpose: 'state' | 'credentials' | 'import',
  sealed: string,
): unknown {
  try {
    if (sealed.length > (purpose === 'import' ? 20000000 : 20000)) throw new Error('Invalid payload');
    const [version, iv, tag, ciphertext, extra] = sealed.split('.');
    if (version !== 'v1' || !iv || !tag || !ciphertext || extra) throw new Error('Invalid payload');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(purpose + ':' + userId));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString(
        'utf8',
      ),
    );
  } catch {
    throw new AppError('Sambungan Google tidak valid. Sambungkan ulang akun Anda.', 400);
  }
}
const stateSchema = z.object({
  state: z.string().min(32).max(256),
  verifier: z.string().min(43).max(256),
  expiresAt: z.number().int(),
});
export function validateGoogleState(userId: string, sealed: string, returnedState: string) {
  const saved = stateSchema.parse(openGooglePayload(userId, 'state', sealed));
  const expected = Buffer.from(saved.state);
  const actual = Buffer.from(returnedState);
  if (saved.expiresAt < Date.now() || expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new AppError('Permintaan sambungan sudah kedaluwarsa atau tidak valid.', 400);
  return saved;
}
function googleClient() {
  if (!googleFormsConfigured()) throw new AppError('Sambungan Google belum diaktifkan pengelola.', 503);
  return new OAuth2Client({
    clientId: process.env.GOOGLE_FORMS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_FORMS_CLIENT_SECRET,
    redirectUri: new URL(GOOGLE_FORMS_CALLBACK_PATH, authBaseUrl()).toString(),
    transporterOptions: { timeout: 20000 },
  });
}
export async function beginGoogleConnection(userId: string) {
  const client = googleClient();
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = randomBytes(32).toString('base64url');
  return {
    cookie: sealGooglePayload(userId, 'state', {
      state,
      verifier: codeVerifier,
      expiresAt: Date.now() + 600000,
    }),
    url: client.generateAuthUrl({
      scope: [GOOGLE_FORMS_SCOPE, GOOGLE_FORMS_RESPONSES_SCOPE],
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: false,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    }),
  };
}
const credentialsSchema = z.object({
  access_token: z.string().min(1).max(4096),
  refresh_token: z.string().max(4096).nullable().optional(),
  expiry_date: z.number().nullable().optional(),
  scope: z.string().min(1).max(2048),
  token_type: z.string().max(100).nullable().optional(),
});
async function saveCredentials(userId: string, credentials: Credentials) {
  const parsed = credentialsSchema.parse(credentials);
  if (!parsed.scope.split(' ').includes(GOOGLE_FORMS_SCOPE))
    throw new AppError('Izin membaca pertanyaan Google Forms belum diberikan.', 403);
  await getDb()
    .prepare(
      'INSERT INTO google_form_connections VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at',
    )
    .run(userId, sealGooglePayload(userId, 'credentials', parsed), new Date().toISOString());
}
export async function completeGoogleConnection(userId: string, cookie: string, state: string, code: string) {
  const saved = validateGoogleState(userId, cookie, state);
  const client = googleClient();
  try {
    const { tokens } = await client.getToken({ code, codeVerifier: saved.verifier });
    if (!tokens.access_token) throw new Error('Missing access token');
    const info = await client.getTokenInfo(tokens.access_token);
    if (info.aud !== process.env.GOOGLE_FORMS_CLIENT_ID || !info.scopes.includes(GOOGLE_FORMS_SCOPE))
      throw new Error('Invalid audience or scope');
    await saveCredentials(userId, { ...tokens, scope: info.scopes.join(' ') });
  } catch {
    throw new AppError('Google belum dapat disambungkan. Tinjau izin lalu coba lagi.', 400);
  }
}
export async function googleConnectionStatus(userId: string) {
  const configured = googleFormsConfigured();
  if (!configured) return { configured: false, connected: false };
  const connection = await getDb()
    .prepare('SELECT ciphertext FROM google_form_connections WHERE user_id = ?')
    .get(userId);
  let canReadResponses = false;
  if (connection) {
    try {
      const saved = credentialsSchema.parse(
        openGooglePayload(userId, 'credentials', String(connection.ciphertext)),
      );
      canReadResponses = saved.scope.split(' ').includes(GOOGLE_FORMS_RESPONSES_SCOPE);
    } catch {
      /* The next connection attempt offers reconnection. */
    }
  }
  return { configured, connected: !!connection, canReadResponses };
}
export async function disconnectGoogleConnection(userId: string) {
  await getDb().prepare('DELETE FROM google_form_connections WHERE user_id = ?').run(userId);
}
export function normalizeGoogleFormId(input: string) {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{10,200}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password)
      throw new Error('Unsupported URL');
    const match = url.pathname.match(/^\/forms\/d\/([a-zA-Z0-9_-]{10,200})(?:\/|$)/);
    if (!match || match[1] === 'e') throw new Error('Responder link');
    return match[1];
  } catch {
    throw new AppError('Gunakan ID form atau link editor Google Forms, bukan link responden.', 400);
  }
}
export async function fetchConnectedGoogleForm(
  userId: string,
  input: string,
  includeResponses = true,
  signal?: AbortSignal,
) {
  const formId = normalizeGoogleFormId(input);
  const record = await getDb()
    .prepare('SELECT ciphertext FROM google_form_connections WHERE user_id = ?')
    .get(userId);
  if (!record) throw new AppError('Sambungkan akun Google sebelum mengambil form.', 400);
  const stored = credentialsSchema.parse(openGooglePayload(userId, 'credentials', String(record.ciphertext)));
  if (includeResponses && !stored.scope.split(' ').includes(GOOGLE_FORMS_RESPONSES_SCOPE))
    throw new AppError('Perbarui izin Google untuk membaca jawaban responden.', 403);
  const client = googleClient();
  client.setCredentials(stored);
  let token: string;
  try {
    const result = await client.getAccessToken();
    if (!result.token) throw new Error('Missing access token');
    token = result.token;
    await saveCredentials(userId, { ...stored, ...client.credentials });
  } catch {
    throw new AppError('Izin Google perlu diperbarui. Sambungkan ulang akun Anda.', 401);
  }
  return fetchGoogleFormData(token, formId, includeResponses, signal);
}

/** Fixed Google API endpoints only. Fetch every page or fail; never import a truncated history. */
export async function fetchGoogleFormData(
  token: string,
  formId: string,
  includeResponses: boolean,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let size = 0;
  const deadline = AbortSignal.timeout(50_000);
  const combinedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  async function read(url: string) {
    const response = await fetcher(url, {
      headers: { Authorization: 'Bearer ' + token },
      signal: combinedSignal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok)
      throw new AppError(
        response.status === 403 || response.status === 404
          ? 'Form tidak ditemukan atau izin membaca pertanyaan/jawaban belum diberikan.'
          : 'Google Forms belum dapat dihubungi. Coba lagi.',
        400,
      );
    const reader = response.body?.getReader();
    if (!reader) throw new AppError('Data Google tidak dapat dibaca.');
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMPORT_BYTES) {
          await reader.cancel();
          throw new AppError('Data melebihi 10 MB. Tidak ada data yang diimpor.', 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  }
  const endpoint =
    'https://forms.googleapis.com/v1/forms/' + encodeURIComponent(normalizeGoogleFormId(formId));
  const form = await read(endpoint);
  parseFormsImport(form);
  const responses: unknown[] = [];
  if (includeResponses) {
    let pageToken = '';
    const seen = new Set<string>();
    do {
      const url = new URL(endpoint + '/responses');
      url.searchParams.set('pageSize', '500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const page = z
        .object({
          responses: z.array(z.unknown()).max(MAX_IMPORT_RESPONSES).default([]),
          nextPageToken: z.string().max(4000).optional(),
        })
        .parse(await read(url.toString()));
      responses.push(...page.responses);
      if (responses.length > MAX_IMPORT_RESPONSES)
        throw new AppError('Impor maksimal 10.000 respons. Tidak ada data yang diimpor.', 413);
      pageToken = page.nextPageToken ?? '';
      if (pageToken && (seen.has(pageToken) || seen.size >= 100))
        throw new AppError('Halaman jawaban Google tidak lengkap. Coba lagi.');
      seen.add(pageToken);
    } while (pageToken);
  }
  return { form, responses };
}
