import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listSurveys, listTemplates } from '@/lib/repository';
import { Overview } from '@/components/overview';
export default async function AllSurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const [surveys, templates, query] = await Promise.all([
    listSurveys(workspaceUser.ownerId, true),
    listTemplates(workspaceUser.ownerId),
    searchParams,
  ]);
  return (
    <Overview
      surveys={surveys}
      templates={templates}
      name={session.user.name}
      listOnly
      initialQuery={query.query?.slice(0, 200) ?? ''}
    />
  );
}
