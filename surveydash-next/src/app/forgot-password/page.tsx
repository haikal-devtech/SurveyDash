import { PasswordRecovery } from '@/components/password-recovery';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Pulihkan akses — SurveyDash Studio',
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return (
    <PasswordRecovery mode="request" available={passwordRecoveryAvailable()} supportEmail={SUPPORT_EMAIL} />
  );
}
