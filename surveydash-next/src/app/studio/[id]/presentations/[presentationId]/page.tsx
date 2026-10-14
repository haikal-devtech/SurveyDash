import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSurvey } from '@/lib/repository';
import { getPresentation } from '@/lib/presentation-repository';
import { PresentationEditor } from '@/components/presentation-editor';
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
  return <PresentationEditor key={document.id} initialDocument={document} survey={survey} />;
}
