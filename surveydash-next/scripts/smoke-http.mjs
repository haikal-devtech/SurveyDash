import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3100';
const account = JSON.parse(
  await readFile(process.env.SMOKE_ACCOUNT_FILE ?? 'test-results/cloud-account.json', 'utf8'),
);
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
  return response.json();
}
await request('/api/surveys', 'GET', undefined, 401, false);
await request('/api/auth/sign-in/email', 'POST', { email: account.email, password: account.password });
assert.ok(cookie);
let survey = await request('/api/surveys', 'POST', {
  title: `QA release ${new Date().toISOString().slice(0, 16)}`,
  templateId: 'experience',
});
survey = await request(`/api/surveys/${survey.id}`, 'PATCH', {
  ...survey,
  status: 'open',
  visibility: 'link',
});
const publicForm = await request(`/api/forms/${survey.token}`, 'GET', undefined, 200, false);
assert.equal(publicForm.questions.length, survey.questions.length);
const answers = Object.fromEntries(
  survey.questions
    .filter((q) => q.required)
    .map((q) => [
      q.id,
      q.type === 'checkbox' ? [q.options[0].id] : q.options.length ? q.options.at(-1).id : 'Respondent QA',
    ]),
);
const key = randomUUID();
await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: key }, 200, false);
await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: key }, 200, false);
let stored = await request(`/api/surveys/${survey.id}`);
assert.equal(stored.submissions.length, 1);
await request(`/api/surveys/${survey.id}`, 'PUT', {
  submissionId: stored.submissions[0].id,
  questionId: 'name',
  value: 'Corrected QA respondent',
  revision: 1,
});
stored = await request(`/api/surveys/${survey.id}`);
assert.equal(stored.audit.length, 1);
assert.equal(stored.submissions[0].revision, 2);
const formTemplate = await request('/api/templates', 'POST', {
  surveyId: survey.id,
  name: 'QA reusable form',
  category: 'form',
});
const clone = await request('/api/surveys', 'POST', {
  title: 'QA cloned survey',
  templateId: formTemplate.id,
});
assert.equal(clone.status, 'draft');
assert.notEqual(clone.token, survey.token);
assert.equal((await request(`/api/surveys/${clone.id}`)).submissions.length, 0);
let deck = await request('/api/presentations', 'POST', {
  surveyId: survey.id,
  title: 'QA visual results',
  theme: 'corporate',
  sections: ['summary', 'charts', 'conclusion'],
});
const bound = deck.slides[0].elements.find((e) => e.binding?.key === 'total');
assert.equal(bound.text, '1');
deck.slides.at(-1).elements.find((e) => e.type === 'text' && !e.binding).text = 'Manual QA notes retained';
deck = await request(`/api/presentations/${deck.id}`, 'PATCH', deck);
const stale = structuredClone(deck);
deck = await request(`/api/presentations/${deck.id}`, 'POST', { action: 'refresh', version: deck.version });
assert.ok(deck.slides.at(-1).elements.some((e) => e.text === 'Manual QA notes retained'));
await request(`/api/presentations/${deck.id}`, 'PATCH', stale, 409);
const preset = await request(`/api/presentations/${deck.id}/template`, 'POST', {
  name: 'QA reusable slide template',
});
assert.ok(preset.slidePreset);
assert.ok(preset.slidePreset.slides.every((s) => s.elements.every((e) => !e.data)));
const mapping = Object.fromEntries(clone.questions.map((q) => [q.id, q.id]));
const reused = await request(`/api/templates/${preset.id}/apply`, 'POST', {
  surveyId: clone.id,
  version: clone.version,
  mapping,
});
assert.equal(reused.slides[0].elements.find((e) => e.binding?.key === 'total').text, '0');
await request(`/api/surveys/${survey.id}/manage`, 'POST', { action: 'archive' });
await request(`/api/forms/${survey.token}`, 'POST', { answers, requestKey: randomUUID() }, 400, false);
const source = {
  info: { title: 'QA imported form' },
  items: [{ title: 'Comments', questionItem: { question: { textQuestion: { paragraph: true } } } }],
};
const imported = await request('/api/import/forms', 'POST', { source, acknowledge: true });
assert.equal(imported.questions[0].type, 'textarea');
assert.equal(imported.status, 'draft');
await request(`/api/surveys/${clone.id}/manage`, 'POST', { action: 'archive' });
await request(`/api/surveys/${imported.id}/manage`, 'POST', { action: 'archive' });
await request(`/api/templates/${formTemplate.id}`, 'PATCH', { archived: true });
await request(`/api/templates/${preset.id}`, 'PATCH', { archived: true });
const report = {
  base,
  checks,
  surveyId: survey.id,
  deckId: deck.id,
  templateId: preset.id,
  passed: true,
  at: new Date().toISOString(),
};
await writeFile('test-results/http-smoke.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
