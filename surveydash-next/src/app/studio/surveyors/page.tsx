import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAccountRole } from '@/lib/account-repository';
import { listWorkspaceSurveyors } from '@/lib/surveyor-repository';
import { ManagerSurveyors } from '@/components/manager-surveyors';

export default async function WorkspaceSurveyorsPage({
  searchParams,
}: {
  searchParams: Promise<{ survey?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  if ((await getAccountRole(session.user.id)) === 'surveyor') redirect('/surveyor');
  const user = await requireWorkspaceUser();
  const [surveys, query] = await Promise.all([listWorkspaceSurveyors(user.ownerId), searchParams]);
  const requestedSurvey = typeof query.survey === 'string' ? query.survey : undefined;
  return (
    <ManagerSurveyors
      key={requestedSurvey ?? 'workspace-surveyors'}
      surveys={surveys}
      initialSurveyId={requestedSurvey}
    />
  );
}
