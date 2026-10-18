import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const SURVEYOR_PRIVACY_VERSION = '2026-10-19-surveyor-v1';
const reserved = new Set([
  'admin',
  'administrator',
  'surveydash',
  'support',
  'help',
  'root',
  'api',
  'studio',
  'surveyor',
]);
export const surveyorProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9_]*$/, 'Username memakai huruf, angka, atau underscore.')
    .refine((value) => !reserved.has(value), 'Username ini tidak tersedia.'),
  fullName: z.string().trim().min(2).max(100),
  bankName: z.string().trim().min(2).max(80),
  accountName: z.string().trim().min(2).max(100),
  accountNumber: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{5,30}$/, 'Nomor rekening harus berisi 5–30 angka.')),
  consent: z.literal(true, { error: 'Setujui penggunaan data profil dan rekening sebelum melanjutkan.' }),
});
export type SurveyorProfileInput = z.infer<typeof surveyorProfileSchema>;
function key() {
  const secret = process.env.SURVEYOR_DATA_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Kunci penyimpanan profil belum dikonfigurasi.');
  return createHash('sha256')
    .update('surveydash-surveyor-payout-v1:' + secret)
    .digest();
}
export function encryptPayout(
  userId: string,
  value: { bankName: string; accountName: string; accountNumber: string },
) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  cipher.setAAD(Buffer.from(userId));
  const content = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    nonce.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    content.toString('base64url'),
  ].join('.');
}
export function decryptPayout(userId: string, value: string) {
  const [version, nonce, tag, content, extra] = value.split('.');
  if (version !== 'v1' || !nonce || !tag || !content || extra || value.length > 4000)
    throw new Error('Invalid payout');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(nonce, 'base64url'));
  cipher.setAAD(Buffer.from(userId));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return z
    .object({ bankName: z.string(), accountName: z.string(), accountNumber: z.string() })
    .parse(
      JSON.parse(
        Buffer.concat([cipher.update(Buffer.from(content, 'base64url')), cipher.final()]).toString('utf8'),
      ),
    );
}
