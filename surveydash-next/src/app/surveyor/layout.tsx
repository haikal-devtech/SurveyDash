import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAccountRole } from '@/lib/account-repository';
import { SurveyorShell } from '@/components/surveyor-portal';
import '../surveyor.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal Surveyor | SurveyDash', robots: { index: false, follow: false } };

export default async function SurveyorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login?role=surveyor');
  if ((await getAccountRole(session.user.id)) !== 'surveyor') redirect('/studio');
  return <SurveyorShell name={session.user.name}>{children}</SurveyorShell>;
}
