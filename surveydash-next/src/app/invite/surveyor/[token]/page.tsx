import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Brand } from '@/components/brand';
import { AcceptSurveyorInvitation } from '@/components/accept-surveyor-invitation';
import { auth } from '@/lib/auth';
import { getAccountRole } from '@/lib/account-repository';
import { AppError } from '@/lib/repository';
import { resolveSurveyorInvitation } from '@/lib/surveyor-invitations';
import '@/app/invitation.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Undangan Surveyor',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function SurveyorInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try {
    invitation = await resolveSurveyorInvitation(token);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session ? await getAccountRole(session.user.id) : null;
  const query = new URLSearchParams({ role: 'surveyor', invite: token });
  return (
    <main className="invite-entry">
      <section className="invite-card">
        <Link href="/" className="invite-brand" aria-label="Beranda SurveyDash">
          <Brand />
        </Link>
        <div className="invite-icon">
          <UserPlus size={26} aria-hidden="true" />
        </div>
        <h1>Undangan Surveyor</h1>
        <p>Anda diundang untuk membantu menyebarkan survei.</p>
        <div className="invite-survey">
          <h2>{invitation.title}</h2>
          {invitation.institution && <p>{invitation.institution}</p>}
        </div>
        {session ? (
          <>
            {role === 'manager' && <p>Undangan ini untuk akun Surveyor.</p>}
            <AcceptSurveyorInvitation token={token} switchAccount={role !== 'surveyor'} />
          </>
        ) : (
          <div className="invite-action">
            <Link className="btn btn-primary" href={'/login?' + query.toString() + '&mode=signup'}>
              Daftar
            </Link>
            <p>
              Sudah punya akun? <Link href={'/login?' + query.toString()}>Masuk</Link>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
