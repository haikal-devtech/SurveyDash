import { notFound } from 'next/navigation';
import { getSurveyByToken } from '@/lib/repository';
import { canAccessForm } from '@/lib/model';
import { PublicForm } from '@/components/public-form';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let survey;
  try {
    survey = await getSurveyByToken(token);
  } catch {
    notFound();
  }
  if (!canAccessForm(survey)) notFound();
  return (
    <PublicForm
      token={token}
      survey={{
        title: survey.title,
        description: survey.description,
        institution: survey.institution,
        status: survey.status,
        demo: survey.demo,
        questions: survey.questions.map((q) => ({
          ...q,
          options: q.options.map((o) => ({ id: o.id, label: o.label })),
        })),
      }}
    />
  );
}
