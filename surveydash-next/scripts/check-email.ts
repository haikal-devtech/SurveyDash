import nodemailer from 'nodemailer';
import { smtpConfiguration, passwordRecoveryAvailable } from '../src/lib/email';
const configuration = smtpConfiguration();
if (!configuration) {
  console.log(
    JSON.stringify({
      configured: false,
      missing: 'SMTP_HOST, SMTP_USER, SMTP_PASSWORD, valid SMTP_FROM/SMTP_PORT',
      emailSent: false,
    }),
  );
  process.exitCode = 2;
} else {
  const { from: _from, ...options } = configuration;
  const transport = nodemailer.createTransport({ ...options, requireTLS: options.requireTLS });
  try {
    await transport.verify();
    console.log(
      JSON.stringify({
        configured: true,
        smtpConnectionAndAuthentication: true,
        passwordRecoveryEnabled: passwordRecoveryAvailable(),
        mailboxDelivery: 'requires a separately authorized mailbox test',
        emailSent: false,
      }),
    );
  } catch {
    console.log(
      JSON.stringify({ configured: true, smtpConnectionAndAuthentication: false, emailSent: false }),
    );
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
