import { AsyncLocalStorage } from 'node:async_hooks';
import { getDb } from './db';
import { AppError } from './repository';
import {
  decryptPayout,
  encryptPayout,
  surveyorProfileSchema,
  SURVEYOR_PRIVACY_VERSION,
  type SurveyorProfileInput,
} from './surveyor-profile';
import type { SurveyorProfile } from './surveyor-types';

export const surveyorRegistration = new AsyncLocalStorage<{
  profile: SurveyorProfileInput;
  pendingUserId?: string;
}>();
export async function getAccountRole(userId: string): Promise<'manager' | 'surveyor'> {
  return (await getDb().prepare('SELECT user_id FROM surveyor_profiles WHERE user_id = ?').get(userId))
    ? 'surveyor'
    : 'manager';
}
export async function assertManager(userId: string) {
  if ((await getAccountRole(userId)) === 'surveyor')
    throw new AppError('Akun Surveyor hanya dapat mengakses penugasan dan profilnya.', 403);
}
export async function assertSurveyor(userId: string) {
  if ((await getAccountRole(userId)) !== 'surveyor')
    throw new AppError('Gunakan akun Surveyor untuk membuka portal ini.', 403);
}
export async function getSurveyorProfile(userId: string): Promise<SurveyorProfile | null> {
  const row = await getDb().prepare('SELECT * FROM surveyor_profiles WHERE user_id = ?').get(userId);
  if (!row) return null;
  try {
    const payout = decryptPayout(userId, String(row.payout_ciphertext));
    return {
      userId,
      username: String(row.username),
      fullName: String(row.full_name),
      bankName: payout.bankName,
      accountName: payout.accountName,
      accountLast4: payout.accountNumber.slice(-4),
      consentAt: String(row.consent_at),
      updatedAt: String(row.updated_at),
    };
  } catch {
    throw new AppError(
      'Profil rekening belum dapat dibaca. Hubungi pengelola untuk memulihkan kunci data.',
      503,
    );
  }
}
async function writeProfile(userId: string, input: unknown, create: boolean) {
  const profile = surveyorProfileSchema.parse(input);
  const encrypted = encryptPayout(userId, {
    bankName: profile.bankName,
    accountName: profile.accountName,
    accountNumber: profile.accountNumber,
  });
  const at = new Date().toISOString();
  try {
    if (create)
      await getDb()
        .prepare('INSERT INTO surveyor_profiles VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(userId, profile.username, profile.fullName, encrypted, SURVEYOR_PRIVACY_VERSION, at, at);
    else
      await getDb()
        .prepare(
          'UPDATE surveyor_profiles SET full_name = ?, payout_ciphertext = ?, consent_version = ?, consent_at = ?, updated_at = ? WHERE user_id = ?',
        )
        .run(profile.fullName, encrypted, SURVEYOR_PRIVACY_VERSION, at, at, userId);
  } catch {
    if (
      await getDb()
        .prepare('SELECT user_id FROM surveyor_profiles WHERE username = ? AND user_id <> ?')
        .get(profile.username, userId)
    )
      throw new AppError('Username sudah dipakai. Pilih username lain.', 409);
    throw new AppError('Profil belum dapat disimpan. Coba lagi.', 500);
  }
}
export async function createSurveyorProfile(userId: string, input: unknown) {
  await writeProfile(userId, input, true);
}
export async function updateSurveyorProfile(userId: string, input: unknown) {
  await assertSurveyor(userId);
  const existing = await getDb()
    .prepare('SELECT username FROM surveyor_profiles WHERE user_id = ?')
    .get(userId);
  const parsed = surveyorProfileSchema.parse(input);
  if (parsed.username !== String(existing.username))
    throw new AppError('Username tidak dapat diubah setelah akun dibuat.');
  await writeProfile(userId, parsed, false);
  return getSurveyorProfile(userId);
}
export async function discardUncreatedProfile(userId: string) {
  if (!(await getDb().prepare('SELECT id FROM "user" WHERE id = ?').get(userId)))
    await getDb().prepare('DELETE FROM surveyor_profiles WHERE user_id = ?').run(userId);
}
