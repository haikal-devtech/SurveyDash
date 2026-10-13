import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = process.env.STUDIO_TEST_URL ?? 'http://127.0.0.1:3100';
const password = `Test-${randomUUID()}!`;
const headers = { Origin: origin, 'Content-Type': 'application/json' };
async function request(path, method = 'GET', body, cookie) {
  const response = await fetch(origin + path, {
    method,
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { response, data };
}
async function account(name) {
  const result = await request('/api/auth/sign-up/email', 'POST', {
    name,
    email: `test-${randomUUID()}@surveydash.local`,
    password,
  });
  assert.equal(result.response.status, 200);
  return result.response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

assert.equal((await request('/api/surveys')).response.status, 401);
const cookie = await account('Test workspace');
const { data: created, response: createResponse } = await request(
  '/api/surveys',
  'POST',
  { title: 'Survei pengujian HTTP', templateId: 'experience' },
  cookie,
);
assert.equal(createResponse.status, 200);
let survey = created;
const update = async (changes) => {
  const result = await request(`/api/surveys/${survey.id}`, 'PATCH', { ...survey, ...changes }, cookie);
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  survey = result.data;
};
assert.equal((await request(`/api/forms/${survey.token}`)).response.status, 404);
await update({ status: 'open', visibility: 'link' });
const publicForm = await request(`/api/forms/${survey.token}`);
assert.equal(publicForm.response.status, 200);
assert.equal(publicForm.data.ownerId, undefined);
assert.equal(publicForm.data.widgets, undefined);
assert.equal(publicForm.data.questions[0].options[0]?.score, undefined);
assert.ok(!(await request('/api/public')).data.some((s) => s.token === survey.token));
const requestKey = randomUUID();
const answers = {
  name: 'Responden uji',
  channel: 'o1',
  satisfaction: 'o4',
  priority: ['o1'],
  feedback: 'Respons pengujian',
};
assert.equal(
  (
    await request(`/api/forms/${survey.token}`, 'POST', {
      answers: { name: 'Kosong' },
      requestKey: randomUUID(),
    })
  ).response.status,
  400,
);
const submitted = await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey });
assert.equal(submitted.response.status, 200);
const retries = await Promise.all(
  Array.from({ length: 4 }, () => request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey })),
);
for (const retry of retries) {
  assert.equal(retry.response.status, 200);
  assert.equal(retry.data.id, submitted.data.id);
  assert.equal(retry.data.duplicate, true);
}
assert.equal(
  (await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey })).data.duplicate,
  true,
);
const stored = await request(`/api/surveys/${survey.id}`, 'GET', undefined, cookie);
assert.equal(stored.data.submissions.length, 1);
assert.equal(stored.data.submissions[0].answers.name, 'Responden uji');
const edit = await request(
  `/api/surveys/${survey.id}`,
  'PUT',
  { submissionId: submitted.data.id, questionId: 'name', value: 'Koreksi uji', revision: 1 },
  cookie,
);
assert.equal(edit.response.status, 200);
assert.equal(edit.data.revision, 2);
const audit = await request(`/api/surveys/${survey.id}`, 'GET', undefined, cookie);
assert.equal(audit.data.audit[0].before, 'Responden uji');
assert.equal(audit.data.audit[0].after, 'Koreksi uji');
const other = await account('Other test workspace');
assert.equal((await request(`/api/surveys/${survey.id}`, 'GET', undefined, other)).response.status, 404);
assert.equal(
  (
    await request(
      `/api/surveys/${survey.id}`,
      'PUT',
      { submissionId: submitted.data.id, questionId: 'name', value: 'Unauthorized', revision: 2 },
      other,
    )
  ).response.status,
  404,
);
await update({ visibility: 'public' });
assert.ok((await request('/api/public')).data.some((s) => s.token === survey.token));
await update({ status: 'closed' });
assert.equal(
  (await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: randomUUID() })).response
    .status,
  400,
);
await update({ status: 'open', visibility: 'private' });
assert.equal((await request(`/api/forms/${survey.token}`)).response.status, 404);
assert.equal(
  (await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: randomUUID() })).response
    .status,
  400,
);
const template = await request(
  `/api/surveys/${survey.id}`,
  'POST',
  { action: 'template', name: 'Template hasil pengujian' },
  cookie,
);
assert.equal(template.response.status, 200);
assert.equal(
  (
    await request(
      '/api/surveys',
      'POST',
      { title: 'Survei dari template pribadi', templateId: template.data.id },
      cookie,
    )
  ).response.status,
  200,
);
const noOrigin = await fetch(origin + '/api/surveys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ title: 'Asal tidak valid', templateId: 'blank' }),
});
assert.equal(noOrigin.status, 403);
console.log(
  'HTTP smoke passed: auth, owner isolation, forms, response persistence, deduplication, audit, visibility, close/private controls, templates, and origin validation.',
);
