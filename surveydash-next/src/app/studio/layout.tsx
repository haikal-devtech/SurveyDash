import { requireWorkspaceUser } from '@/lib/http';
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
  const workspaceUser = await requireWorkspaceUser();
  const [usage, workspace] = await Promise.all([
    getUsage(workspaceUser.ownerId),
    getWorkspace(workspaceUser.ownerId),
  ]);
  return (
    <Shell
      name={session.user.name}
      image={session.user.image}
      usage={usage}
      workspace={workspace}
      isAdmin={workspaceUser.isAdmin}
      managingOther={workspaceUser.managingOther}
      userId={session.user.id}
    >
      {children}
    </Shell>
  );
}
