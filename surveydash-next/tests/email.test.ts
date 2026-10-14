import test from 'node:test';
import assert from 'node:assert/strict';
import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'node:net';
import { smtpConfiguration, sendPasswordResetEmail } from '../src/lib/email';

test('SMTP configuration requires complete credentials and never disables TLS for a remote or production host', () => {
  assert.equal(smtpConfiguration({}), null);
  const configured = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'qa',
    SMTP_PASSWORD: 'test-only',
    SMTP_PORT: '587',
    SMTP_FROM: 'help@surveydash.id',
    SMTP_TEST_MODE: 'true',
    NODE_ENV: 'development',
  };
  assert.equal(smtpConfiguration(configured)?.requireTLS, true);
  assert.equal(smtpConfiguration({ ...configured, SMTP_HOST: '127.0.0.1' })?.requireTLS, false);
  assert.equal(
    smtpConfiguration({ ...configured, SMTP_HOST: '127.0.0.1', NODE_ENV: 'production' })?.requireTLS,
    true,
  );
  assert.equal(smtpConfiguration({ ...configured, SMTP_PORT: 'invalid' }), null);
  assert.equal(
    smtpConfiguration({ ...configured, SMTP_FROM: 'help@surveydash.id\nBcc:other@example.test' }),
    null,
  );
});
test('password recovery mail crosses a real local SMTP connection and escapes untrusted names', async () => {
  let message = '';
  const server = new SMTPServer({
    disabledCommands: ['STARTTLS'],
    logger: false,
    onAuth(auth, _session, callback) {
      callback(auth.username === 'qa' && auth.password === 'local-test-only' ? null : new Error('Denied'), {
        user: 'qa',
      });
    },
    onData(stream, _session, callback) {
      stream.on('data', (chunk) => {
        message += chunk.toString();
      });
      stream.on('end', () => callback());
    },
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.server.address() as AddressInfo).port;
  const changes = {
    NODE_ENV: 'test',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(port),
    SMTP_USER: 'qa',
    SMTP_PASSWORD: 'local-test-only',
    SMTP_FROM: 'help@surveydash.id',
    SMTP_TEST_MODE: 'true',
    BETTER_AUTH_URL: 'http://localhost:3100',
  };
  const previous = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));
  Object.assign(process.env, changes);
  try {
    await sendPasswordResetEmail(
      { name: '<script>test</script>', email: 'recipient@example.test' },
      'http://localhost:3100/reset-password?token=test-only',
    );
    const decoded = message
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    assert.ok(decoded.includes('recipient@example.test'));
    assert.ok(decoded.includes('&lt;script&gt;test&lt;/script&gt;'));
    assert.ok(!decoded.includes('<script>test</script></p>'));
    assert.ok(decoded.includes('30 menit'));
    await assert.rejects(
      () =>
        sendPasswordResetEmail(
          { name: 'QA', email: 'recipient@example.test' },
          'https://untrusted.example/reset-password',
        ),
      /tidak valid/,
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise<void>((resolve) => server.close(resolve));
  }
});
