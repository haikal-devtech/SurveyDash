import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDb, closeDatabase } from '../src/lib/db';
if (process.env.ALLOW_STAGING_RESTORE !== 'true') throw Error('Uji admin sementara hanya di staging.');
const base = 'http://127.0.0.1:3100';
const qa = JSON.parse(await readFile('test-results/cloud-account.json', 'utf8'));
const client = JSON.parse(await readFile('test-results/client-credentials.json', 'utf8'));
const qaUser = await getDb().prepare('SELECT id FROM "user" WHERE email = ?').get(qa.email);
const clientUser = await getDb().prepare('SELECT id FROM "user" WHERE email = ?').get(client.email);
assert.ok(qaUser && clientUser);
const cookies = new Map<string, string>();
let checks = 0;
async function request(
  path: string,
  method = 'GET',
  body?: unknown,
  status = 200,
  authenticated = true,
  extraCookie = '',
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(authenticated
        ? {
            Cookie:
              [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') +
              (extraCookie ? `; ${extraCookie}` : ''),
          }
        : {}),
      ...(method !== 'GET' ? { Origin: base, 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  for (const entry of response.headers.getSetCookie()) {
    const pair = entry.split(';')[0];
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  assert.equal(
    response.status,
    status,
    `${method} ${path.split('/').slice(0, 3).join('/')} status ${response.status}`,
  );
  checks++;
  return response.json();
}
const wasAdmin = await getDb()
  .prepare('SELECT user_id FROM platform_admins WHERE user_id = ?')
  .get(String(qaUser.id));
try {
  await request('/api/admin/workspaces', 'GET', undefined, 401, false);
  await request('/api/auth/sign-in/email', 'POST', { email: client.email, password: client.password });
  assert.equal((await request('/api/workspace')).access.isAdmin, false);
  await request('/api/admin/workspaces', 'GET', undefined, 403);
  await request('/api/admin/workspaces', 'POST', { ownerId: String(qaUser.id) }, 403);
  const clientSurveys = await request(
    '/api/surveys',
    'GET',
    undefined,
    200,
    true,
    `studio_workspace=${qaUser.id}`,
  );
  assert.ok(
    clientSurveys.surveys.length >= 2 &&
      clientSurveys.surveys.every((survey: { ownerId: string }) => survey.ownerId === clientUser.id),
  );
  await request('/api/surveys/92e2d850-cfab-4fb6-93c8-f043e24902b2', 'GET', undefined, 404);
  await getDb()
    .prepare('INSERT INTO platform_admins VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING')
    .run(String(qaUser.id), new Date().toISOString());
  cookies.clear();
  await request('/api/auth/sign-in/email', 'POST', { email: qa.email, password: qa.password });
  assert.equal((await request('/api/workspace')).access.isAdmin, true);
  assert.ok((await request('/api/admin/workspaces')).some((row: { id: string }) => row.id === clientUser.id));
  await request('/api/admin/workspaces', 'POST', { ownerId: String(clientUser.id) });
  const selected = await request('/api/workspace');
  assert.ok(selected.access.managingOther);
  assert.equal(selected.workspace.name, 'Workspace uji client');
  assert.ok(
    (await request('/api/surveys')).surveys.every(
      (survey: { ownerId: string }) => survey.ownerId === clientUser.id,
    ),
  );
  await request('/api/admin/workspaces', 'POST', { ownerId: String(qaUser.id) });
  assert.equal((await request('/api/workspace')).access.managingOther, false);
  console.log(
    JSON.stringify({
      checks,
      result: 'Admin switching and client isolation passed; temporary staging role removed.',
    }),
  );
} finally {
  if (!wasAdmin)
    await getDb().prepare('DELETE FROM platform_admins WHERE user_id = ?').run(String(qaUser.id));
  await closeDatabase();
}
