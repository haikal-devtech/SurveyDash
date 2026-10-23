import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SettingsForm } from '@/components/settings-forms';
import Link from 'next/link';
import { passwordRecoveryAvailable } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/support';
import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { AccountSecurity } from '@/components/account-security';
export default async function AccountPage() {
  await requireWorkspaceUser({ area: 'shell' });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Akun Anda.</h1>
          <p>Identitas yang ditampilkan di workspace.</p>
        </div>
      </div>
      <SettingsForm
        type="account"
        initialName={session.user.name}
        email={session.user.email}
        initialImage={session.user.image}
      />
      <p className="template-safe-note">
        {passwordRecoveryAvailable() ? (
          <Link className="text-link" href="/forgot-password">
            Kirim link pemulihan kata sandi
          </Link>
        ) : (
          <>
            Butuh bantuan akses akun? Hubungi{' '}
            <a className="text-link" href={'mailto:' + SUPPORT_EMAIL}>
              {SUPPORT_EMAIL}
            </a>
            .
          </>
        )}
      </p>
      <AccountSecurity
        email={session.user.email}
        verified={session.user.emailVerified}
        enabled={session.user.twoFactorEnabled ?? false}
        emailAvailable={passwordRecoveryAvailable()}
      />
    </>
  );
}
