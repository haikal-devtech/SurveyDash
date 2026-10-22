import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { InvitationEntry } from '@/components/invitation-entry';
import { AcceptInvitation } from '@/components/accept-invitation';
import { auth } from '@/lib/auth';
import { getAccountRole } from '@/lib/account-repository';
import { resolveWorkspaceInvitation } from '@/lib/workspace-team';
import { AppError } from '@/lib/repository';
import '@/app/invitation.css';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Undangan workspace',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function WorkspaceInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try {
    invitation = await resolveWorkspaceInvitation(token);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session ? await getAccountRole(session.user.id) : null;
  const query = new URLSearchParams({ role: 'manager', workspaceInvite: token });
  return (
    <InvitationEntry title="Undangan workspace" description="Bergabung sebagai Pengelola Survei.">
      <div className="invite-survey">
        <h2>{invitation.name}</h2>
        <p>
          Anda dapat membuat dan mengedit survei, melihat jawaban, serta mengelola presentasi dalam workspace
          ini.
        </p>
      </div>
      {session ? (
        <>
          {role === 'surveyor' && <p>Gunakan akun Pengelola Survei untuk bergabung.</p>}
          <AcceptInvitation token={token} kind="workspace" switchAccount={role !== 'manager'} />
        </>
      ) : (
        <div className="invite-action">
          <Link className="btn btn-primary" href={'/login?' + query.toString()}>
            Masuk dan bergabung
          </Link>
          <p>
            Belum punya akun?{' '}
            <Link href={'/login?' + query.toString() + '&mode=signup'}>Daftar Pengelola</Link>
          </p>
        </div>
      )}
    </InvitationEntry>
  );
}
