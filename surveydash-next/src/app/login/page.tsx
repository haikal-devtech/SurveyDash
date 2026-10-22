import { LoginForm } from '@/components/login-form';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; role?: string; invite?: string; workspaceInvite?: string }>;
}) {
  const parameters = await searchParams;
  const workspaceInvitationToken =
    parameters.workspaceInvite && /^[a-zA-Z0-9_-]{32}$/.test(parameters.workspaceInvite)
      ? parameters.workspaceInvite
      : undefined;
  const invitationToken =
    !workspaceInvitationToken && parameters.invite && /^[a-zA-Z0-9_-]{32}$/.test(parameters.invite)
      ? parameters.invite
      : undefined;
  return (
    <LoginForm
      key={`${parameters.role}:${parameters.mode}:${workspaceInvitationToken ?? invitationToken ?? ''}`}
      invitationToken={invitationToken}
      workspaceInvitationToken={workspaceInvitationToken}
      initialRegister={parameters.mode === 'signup'}
      role={!workspaceInvitationToken && parameters.role === 'surveyor' ? 'surveyor' : 'manager'}
      recoveryAvailable={passwordRecoveryAvailable()}
      supportEmail={SUPPORT_EMAIL}
    />
  );
}
