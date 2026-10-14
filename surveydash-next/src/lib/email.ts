import nodemailer from 'nodemailer';
import { authBaseUrl } from './origins';
import { SUPPORT_EMAIL } from './support';

export function smtpConfiguration(environment: Record<string, string | undefined> = process.env) {
  const host = environment.SMTP_HOST?.trim();
  const user = environment.SMTP_USER;
  const pass = environment.SMTP_PASSWORD;
  const from = environment.SMTP_FROM?.trim() || SUPPORT_EMAIL;
  const port = Number(environment.SMTP_PORT || 587);
  if (
    !host ||
    !user ||
    !pass ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    return null;
  const localTest =
    environment.NODE_ENV !== 'production' &&
    environment.SMTP_TEST_MODE === 'true' &&
    ['127.0.0.1', 'localhost', '::1'].includes(host);
  return {
    host,
    port,
    from,
    secure: port === 465,
    requireTLS: !localTest,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: true },
  };
}
export function passwordRecoveryAvailable() {
  return process.env.PASSWORD_RECOVERY_ENABLED === 'true' && smtpConfiguration() !== null;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

export async function sendPasswordResetEmail(user: { name: string; email: string }, url: string) {
  const configuration = smtpConfiguration();
  if (!configuration) throw new Error('Layanan email belum dikonfigurasikan.');
  const link = new URL(url);
  if (link.origin !== new URL(authBaseUrl()).origin) throw new Error('Alamat pemulihan tidak valid.');
  const { from, ...transportOptions } = configuration;
  const transport = nodemailer.createTransport(transportOptions);
  try {
    await transport.sendMail({
      from: { name: 'SurveyDash Studio', address: from },
      to: user.email,
      subject: 'Atur ulang kata sandi SurveyDash Studio',
      text:
        'Halo ' +
        user.name +
        ',\n\nBuka link berikut untuk mengatur ulang kata sandi:\n' +
        url +
        '\n\nLink berlaku selama 30 menit dan hanya dapat dipakai sekali. ' +
        'Jika Anda tidak meminta perubahan ini, abaikan email ini.\n\nSurveyDash Studio',
      html:
        '<div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.7;color:#20203d">' +
        '<h1 style="font-size:24px">Atur ulang kata sandi</h1><p>Halo ' +
        escapeHtml(user.name) +
        ',</p>' +
        '<p>Gunakan tombol berikut untuk membuat kata sandi baru.</p>' +
        '<p><a href="' +
        escapeHtml(url) +
        '" style="display:inline-block;background:#7549df;' +
        'color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px">Atur ulang kata sandi</a></p>' +
        '<p>Link berlaku 30 menit dan hanya dapat dipakai sekali. Jika Anda tidak meminta perubahan ini, ' +
        'abaikan email ini.</p><p>SurveyDash Studio</p></div>',
    });
  } catch {
    throw new Error('Email pemulihan belum dapat dikirim.');
  } finally {
    transport.close();
  }
}
