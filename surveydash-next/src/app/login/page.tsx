import { LoginForm } from '@/components/login-form';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; role?: string }>;
}) {
  const parameters = await searchParams;
  return (
    <LoginForm
      initialRegister={parameters.mode === 'signup'}
      role={parameters.role === 'surveyor' ? 'surveyor' : 'manager'}
      recoveryAvailable={passwordRecoveryAvailable()}
      supportEmail={SUPPORT_EMAIL}
    />
  );
}
