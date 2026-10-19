import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Shell } from '@/components/shell';
import { getWorkspace } from '@/lib/workspace-repository';
import { getAccountRole } from '@/lib/account-repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  if ((await getAccountRole(session.user.id)) === 'surveyor') redirect('/surveyor');
  const workspaceUser = await requireWorkspaceUser();
  const workspace = await getWorkspace(workspaceUser.ownerId);
  return (
    <Shell
      name={session.user.name}
      image={session.user.image}
      workspace={workspace}
      isAdmin={workspaceUser.isAdmin}
      managingOther={workspaceUser.managingOther}
      userId={session.user.id}
    >
      {children}
    </Shell>
  );
}
