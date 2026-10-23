import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Shell } from '@/components/shell';
import { getWorkspace } from '@/lib/workspace-repository';
import { getAccountRole } from '@/lib/account-repository';
import { listAvailableWorkspaces } from '@/lib/workspace-team';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  if ((await getAccountRole(session.user.id)) === 'surveyor') redirect('/surveyor');
  const workspaceUser = await requireWorkspaceUser({ area: 'shell' });
  const workspace = await getWorkspace(workspaceUser.ownerId);
  return (
    <Shell
      name={session.user.name}
      image={session.user.image}
      workspace={workspace}
      isAdmin={workspaceUser.isAdmin}
      managingOther={workspaceUser.managingOther}
      userId={session.user.id}
      workspaceChoices={await listAvailableWorkspaces(session.user.id)}
      currentOwnerId={workspaceUser.ownerId}
      role={workspaceUser.workspaceRole}
    >
      {children}
    </Shell>
  );
}
