import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAccountRole } from '@/lib/account-repository';
import { SurveyorPortal } from '@/components/surveyor-portal';
import { AccountSecurity } from '@/components/account-security';
import { passwordRecoveryAvailable } from '@/lib/email';

export default async function SurveyorProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login?role=surveyor');
  if ((await getAccountRole(session.user.id)) !== 'surveyor') redirect('/studio');
  return (
    <>
      <SurveyorPortal profileOnly initialName={session.user.name} />
      <AccountSecurity
        email={session.user.email}
        verified={session.user.emailVerified}
        enabled={session.user.twoFactorEnabled ?? false}
        emailAvailable={passwordRecoveryAvailable()}
      />
    </>
  );
}
