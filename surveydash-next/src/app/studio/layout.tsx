import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Shell } from '@/components/shell';
import { getUsage, getWorkspace } from '@/lib/workspace-repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const [usage, workspace] = await Promise.all([getUsage(session.user.id), getWorkspace(session.user.id)]);
  return (
    <Shell name={session.user.name} usage={usage} workspace={workspace}>
      {children}
    </Shell>
  );
}
