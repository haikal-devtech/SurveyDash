import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listSurveys, listTemplates } from '@/lib/repository';
import { Overview } from '@/components/overview';
import { ensureAutomaticDemo } from '@/lib/demo-workspace';
export default async function StudioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser({ area: 'shell' });
  if (workspaceUser.workspaceRole === 'coordinator') redirect('/studio/fieldwork');
  await ensureAutomaticDemo(workspaceUser.ownerId);
  const surveys = await listSurveys(workspaceUser.ownerId, true);
  return (
    <Overview
      surveys={surveys}
      templates={await listTemplates(workspaceUser.ownerId)}
      name={session.user.name}
    />
  );
}
