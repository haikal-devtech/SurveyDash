import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSurvey } from '@/lib/repository';
import { getPresentation } from '@/lib/presentation-repository';
import { PresentationEditor } from '@/components/presentation-editor';
import { ReadonlyPresentation } from '@/components/readonly-presentation';
export default async function PresentationPage({
  params,
}: {
  params: Promise<{ id: string; presentationId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const { id, presentationId } = await params;
  let document;
  try {
    document = await getPresentation(presentationId, workspaceUser.ownerId);
    if (document.surveyId !== id || document.archivedAt) notFound();
  } catch {
    notFound();
  }
  const survey = await getSurvey(id, workspaceUser.ownerId);
  if (workspaceUser.workspaceRole === 'viewer') return <ReadonlyPresentation document={document} />;
  return <PresentationEditor key={document.id} initialDocument={document} survey={survey} />;
}
