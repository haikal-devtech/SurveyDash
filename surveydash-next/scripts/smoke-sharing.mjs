import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3100';
const account = JSON.parse(await readFile('test-results/cloud-account.json', 'utf8'));
let cookie = '';
let checks = 0;
async function request(path, method = 'GET', body, expected = 200, authenticated = true) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(method !== 'GET' ? { Origin: base, 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (path === '/api/auth/sign-in/email')
    cookie = response.headers
      .getSetCookie()
      .map((entry) => entry.split(';')[0])
      .join('; ');
  assert.equal(
    response.status,
    expected,
    `${method} ${path.split('/').slice(0, 3).join('/')} returned ${response.status}`,
  );
  checks++;
  if (path.startsWith('/p/')) {
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    return response.text();
  }
  return response.json();
}
await request('/api/auth/sign-in/email', 'POST', { email: account.email, password: account.password });
assert.ok(cookie);
let survey;
let doc;
try {
  survey = await request('/api/surveys', 'POST', {
    title: `QA sharing ${new Date().toISOString().slice(0, 16)}`,
    templateId: 'experience',
  });
  survey = await request(`/api/surveys/${survey.id}`, 'PATCH', {
    ...survey,
    status: 'open',
    visibility: 'link',
  });
  const privateMarker = `PRIVATE-QA-${randomUUID()}`;
  const answers = Object.fromEntries(
    survey.questions
      .filter((q) => q.required)
      .map((q) => [
        q.id,
        q.type === 'checkbox' ? [q.options[0].id] : q.options.length ? q.options.at(-1).id : privateMarker,
      ]),
  );
  await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: randomUUID() }, 200, false);
  doc = await request('/api/presentations', 'POST', {
    surveyId: survey.id,
    title: 'QA — hasil agregat berbagi',
    sections: ['cover', 'summary', 'charts'],
  });
  const path = `/api/presentations/${doc.id}`;
  const sharePath = `${path}/share`;
  await request(sharePath, 'GET', undefined, 401, false);
  assert.equal((await request(sharePath)).active, false);
  await request(sharePath, 'POST', { version: doc.version, acknowledge: false }, 400);
  await request(sharePath, 'POST', { version: doc.version + 1, acknowledge: true }, 409);
  let share = await request(sharePath, 'POST', { version: doc.version, acknowledge: true });
  const firstToken = new URL(share.url).pathname.split('/').at(-1);
  let snapshot = await request(`/api/shared/${firstToken}`, 'GET', undefined, 200, false);
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    ['title', 'slides', 'demo', 'publishedAt', 'sourceVersion'].sort(),
  );
  const encoded = JSON.stringify(snapshot);
  assert.ok(
    !encoded.includes(privateMarker) && !encoded.includes(survey.id) && !encoded.includes(survey.token),
  );
  assert.ok(snapshot.slides.every((s) => s.elements.every((e) => !e.binding?.questionId)));
  await request(`/api/shared/${firstToken}/assets/unknown`, 'GET', undefined, 404, false);
  const page = await request(`/p/${firstToken}`, 'GET', undefined, 200, false);
  assert.ok(page.includes(doc.title) && !page.includes(privateMarker));
  const firstText = doc.slides[0].elements.find((e) => e.type === 'text' && !e.binding);
  const reviewedText = 'QA — versi baru yang telah ditinjau';
  firstText.text = reviewedText;
  doc = await request(path, 'PATCH', doc);
  assert.equal(
    JSON.stringify(await request(`/api/shared/${firstToken}`, 'GET', undefined, 200, false)),
    encoded,
  );
  share = await request(sharePath, 'POST', { version: doc.version, acknowledge: true });
  assert.equal(new URL(share.url).pathname.split('/').at(-1), firstToken);
  snapshot = await request(`/api/shared/${firstToken}`, 'GET', undefined, 200, false);
  assert.ok(JSON.stringify(snapshot).includes(reviewedText));
  await request(sharePath, 'DELETE');
  await request(`/api/shared/${firstToken}`, 'GET', undefined, 404, false);
  await request(`/p/${firstToken}`, 'GET', undefined, 404, false);
  share = await request(sharePath, 'POST', { version: doc.version, acknowledge: true });
  const secondToken = new URL(share.url).pathname.split('/').at(-1);
  assert.notEqual(secondToken, firstToken);
  await request(`/api/shared/${firstToken}`, 'GET', undefined, 404, false);
  doc = await request(path, 'POST', { action: 'archive' });
  await request(`/api/shared/${secondToken}`, 'GET', undefined, 404, false);
  assert.ok(!(await request(`/api/presentations?surveyId=${survey.id}`)).some((d) => d.id === doc.id));
  assert.ok(
    (await request(`/api/presentations?surveyId=${survey.id}&archived=include`)).some((d) => d.id === doc.id),
  );
  doc = await request(path, 'POST', { action: 'unarchive' });
  assert.equal((await request(sharePath)).active, false);
  await request(`/api/shared/${secondToken}`, 'GET', undefined, 404, false);
  share = await request(sharePath, 'POST', { version: doc.version, acknowledge: true });
  const thirdToken = new URL(share.url).pathname.split('/').at(-1);
  await request(`/api/surveys/${survey.id}/manage`, 'POST', { action: 'trash' });
  await request(`/api/shared/${thirdToken}`, 'GET', undefined, 404, false);
  await request(`/api/surveys/${survey.id}/manage`, 'POST', { action: 'restore' });
  assert.equal((await request(sharePath)).active, false);
  await request(`/api/shared/${thirdToken}`, 'GET', undefined, 404, false);
  await writeFile(
    'test-results/sharing-smoke.json',
    JSON.stringify(
      { base, surveyId: survey.id, presentationId: doc.id, checks, linksRevoked: true },
      null,
      2,
    ),
  );
} finally {
  if (doc) await request(`/api/presentations/${doc.id}/share`, 'DELETE');
  if (doc) await request(`/api/presentations/${doc.id}`, 'POST', { action: 'archive' });
  if (survey) await request(`/api/surveys/${survey.id}/manage`, 'POST', { action: 'archive' });
}
console.log(
  JSON.stringify({
    base,
    checks,
    result: 'Sharing lifecycle passed; all test links revoked and fixtures archived.',
  }),
);
