// Explicit operational task; never invoked by the web app or deployment build.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { auth } from '../src/lib/auth';
import { closeDatabase, getDb, initializeDatabase } from '../src/lib/db';
import { ensureDemoWorkspace, getSurvey, listSurveys, saveTemplate } from '../src/lib/repository';
import { createPresentation, listPresentations, saveSlideTemplate } from '../src/lib/presentation-repository';
import { saveWorkspace } from '../src/lib/workspace-repository';
const environment = process.argv[2];
const adminEmails = process.argv.slice(3);
if (!['staging', 'production'].includes(environment))
  throw Error('Pilih staging atau production secara eksplisit.');
if (!adminEmails.length || adminEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
  throw Error('Berikan alamat akun admin yang disetujui secara eksplisit.');
if (!process.env.DATABASE_URL) throw Error('Database cloud diperlukan.');
const path = 'test-results/client-credentials.json';
type Credentials = {
  email: string;
  password: string;
  name: string;
  admins: Record<string, { password?: string; createdProduction?: boolean }>;
  productionReady?: boolean;
};
let credentials: Credentials;
try {
  credentials = JSON.parse(await readFile(path, 'utf8'));
} catch {
  credentials = {
    email: `client.flow.${randomBytes(4).toString('hex')}@surveydash.test`,
    password: `Sd!${randomBytes(18).toString('base64url')}`,
    name: 'Client Demo SurveyDash',
    admins: {},
  };
}
await mkdir('test-results', { recursive: true });
// Persist generated secrets before provisioning so retries never reset an existing account.
await writeFile(path, JSON.stringify(credentials, null, 2), { mode: 0o600 });
await initializeDatabase();
async function account(email: string, name: string, password: string) {
  const existing = await getDb()
    .prepare('SELECT id FROM "user" WHERE lower(email) = ?')
    .get(email.toLowerCase());
  if (existing) return { id: String(existing.id), created: false };
  const result = await auth.api.signUpEmail({ body: { email, name, password } });
  return { id: result.user.id, created: true };
}
try {
  for (const email of adminEmails) {
    credentials.admins[email] ??= {};
    const password = credentials.admins[email].password ?? `Sd!${randomBytes(18).toString('base64url')}`;
    const user = await account(email, email.split('@')[0], password);
    if (user.created) credentials.admins[email].password = password;
    if (environment === 'production') credentials.admins[email].createdProduction = user.created;
    await getDb()
      .prepare('INSERT INTO platform_admins VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING')
      .run(user.id, new Date().toISOString());
    console.log(
      JSON.stringify({
        environment,
        email,
        role: 'platform_admin',
        created: user.created,
        passwordReset: false,
      }),
    );
  }
  const client = await account(credentials.email, credentials.name, credentials.password);
  await saveWorkspace(client.id, {
    name: 'Workspace uji client',
    description: 'Akses penuh untuk menguji form, data simulasi, template, dan presentasi.',
    locale: 'id-ID',
  });
  await ensureDemoWorkspace(client.id);
  const surveys = await listSurveys(client.id);
  const demo = surveys.find((s) => s.kind === 'skm' && s.demo);
  if (demo && !(await listPresentations(demo.id, client.id, true)).length) {
    const deck = await createPresentation(
      demo.id,
      client.id,
      'Laporan SKM — latihan client',
      'professional',
      ['cover', 'summary', 'demographic', 'ikm', 'charts', 'conclusion'],
    );
    await saveSlideTemplate(deck.id, client.id, 'Laporan SKM — template latihan');
    await saveTemplate(await getSurvey(demo.id, client.id), 'Form SKM — template latihan', 'form');
  }
  if (environment === 'production') credentials.productionReady = true;
  console.log(
    JSON.stringify({
      environment,
      clientEmail: credentials.email,
      created: client.created,
      scope: 'isolated_demo_workspace',
      surveys: surveys.length,
      credentialsFile: path,
    }),
  );
} finally {
  await writeFile(path, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  await closeDatabase();
}
