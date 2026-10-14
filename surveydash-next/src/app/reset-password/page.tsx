import { PasswordRecovery } from '@/components/password-recovery';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Kata sandi baru — SurveyDash Studio',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  const token = parameters.token && parameters.token.length <= 256 ? parameters.token : undefined;
  return (
    <PasswordRecovery
      mode="reset"
      available={passwordRecoveryAvailable()}
      supportEmail={SUPPORT_EMAIL}
      token={token}
      invalidToken={!!parameters.error}
    />
  );
}
