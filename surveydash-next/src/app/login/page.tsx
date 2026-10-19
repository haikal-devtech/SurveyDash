import { LoginForm } from '@/components/login-form';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; role?: string; invite?: string }>;
}) {
  const parameters = await searchParams;
  const invitationToken =
    parameters.invite && /^[a-zA-Z0-9_-]{32}$/.test(parameters.invite) ? parameters.invite : undefined;
  return (
    <LoginForm
      key={`${parameters.role}:${parameters.mode}:${invitationToken ?? ''}`}
      invitationToken={invitationToken}
      initialRegister={parameters.mode === 'signup'}
      role={parameters.role === 'surveyor' ? 'surveyor' : 'manager'}
      recoveryAvailable={passwordRecoveryAvailable()}
      supportEmail={SUPPORT_EMAIL}
    />
  );
}
