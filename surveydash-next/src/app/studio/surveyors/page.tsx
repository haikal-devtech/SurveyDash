import { requireWorkspaceUser } from '@/lib/http';
import { listWorkspaceSurveyors } from '@/lib/surveyor-repository';
import { ManagerSurveyors } from '@/components/manager-surveyors';

export default async function WorkspaceSurveyorsPage({
  searchParams,
}: {
  searchParams: Promise<{ survey?: string | string[] }>;
}) {
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
