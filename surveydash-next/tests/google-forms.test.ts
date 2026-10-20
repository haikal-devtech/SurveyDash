import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  beginGoogleConnection,
  normalizeGoogleFormId,
  openGooglePayload,
  sealGooglePayload,
  validateGoogleState,
  GOOGLE_FORMS_SCOPE,
  GOOGLE_FORMS_RESPONSES_SCOPE,
} from '../src/lib/google-forms';

process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('base64url');
process.env.BETTER_AUTH_URL = 'http://localhost:3100';
process.env.GOOGLE_FORMS_CLIENT_ID = 'test-client.apps.googleusercontent.com';
process.env.GOOGLE_FORMS_CLIENT_SECRET = 'test-only-client-secret';
test('Google connector uses read-only form scope, PKCE and owner-bound expiring encrypted state', async () => {
  const connection = await beginGoogleConnection('owner');
  const url = new URL(connection.url);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.deepEqual(url.searchParams.get('scope')?.split(' '), [
    GOOGLE_FORMS_SCOPE,
    GOOGLE_FORMS_RESPONSES_SCOPE,
  ]);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.ok(!connection.url.includes(process.env.GOOGLE_FORMS_CLIENT_SECRET!));
  const state = url.searchParams.get('state')!;
  const saved = validateGoogleState('owner', connection.cookie, state);
  assert.ok(saved.verifier.length >= 43);
  assert.ok(!connection.cookie.includes(saved.verifier));
  assert.throws(() => validateGoogleState('other', connection.cookie, state));
  assert.throws(() => validateGoogleState('owner', connection.cookie, 'wrong-state'));
  const expired = sealGooglePayload('owner', 'state', { ...saved, expiresAt: Date.now() - 1 });
  assert.throws(() => validateGoogleState('owner', expired, state), /kedaluwarsa/);
  const credentials = sealGooglePayload('owner', 'credentials', { access_token: 'private-test-token' });
  assert.ok(!credentials.includes('private-test-token'));
  assert.deepEqual(openGooglePayload('owner', 'credentials', credentials), {
    access_token: 'private-test-token',
  });
  assert.throws(() => openGooglePayload('other', 'credentials', credentials));
  assert.throws(() => openGooglePayload('owner', 'state', credentials));
  const parts = credentials.split('.');
  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  assert.throws(() => openGooglePayload('owner', 'credentials', parts.join('.')));
});
test('form IDs accept editor links and refuse respondent links, unrelated hosts and arbitrary URLs', () => {
  const id = 'abcdefghijklmnopqrstuv';
  assert.equal(normalizeGoogleFormId(id), id);
  assert.equal(normalizeGoogleFormId('https://docs.google.com/forms/d/' + id + '/edit?usp=sharing'), id);
  assert.throws(() => normalizeGoogleFormId('https://docs.google.com/forms/d/e/' + id + '/viewform'));
  assert.throws(() => normalizeGoogleFormId('https://example.test/forms/d/' + id + '/edit'));
  assert.throws(() => normalizeGoogleFormId('http://127.0.0.1/private'));
  assert.throws(() => normalizeGoogleFormId('https://user:password@docs.google.com/forms/d/' + id + '/edit'));
});
