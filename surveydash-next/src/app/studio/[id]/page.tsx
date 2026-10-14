import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSurvey } from '@/lib/repository';
import { SurveyEditor } from '@/components/survey-editor';
export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const { id } = await params;
  let survey;
  try {
    survey = await getSurvey(id, workspaceUser.ownerId);
  } catch {
    notFound();
  }
  return <SurveyEditor key={survey.id} initialSurvey={survey} />;
}
