import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SettingsForm } from '@/components/settings-forms';
export default async function AccountPage() {
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
      <SettingsForm type="account" initialName={session.user.name} email={session.user.email} />
      <p className="template-safe-note">Pemulihan kata sandi melalui email belum tersedia pada versi ini.</p>
    </>
  );
}
