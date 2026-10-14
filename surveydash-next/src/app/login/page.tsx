import { LoginForm } from '@/components/login-form';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return (
    <LoginForm
      initialRegister={(await searchParams).mode === 'signup'}
      recoveryAvailable={passwordRecoveryAvailable()}
      supportEmail={SUPPORT_EMAIL}
    />
  );
}
