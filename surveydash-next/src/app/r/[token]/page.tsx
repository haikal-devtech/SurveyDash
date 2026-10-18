import { notFound } from 'next/navigation';
import { PublicForm } from '@/components/public-form';
import { resolveReferral } from '@/lib/surveyor-repository';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function ReferralPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let source;
  try {
    source = await resolveReferral(token);
  } catch {
    notFound();
  }
  const { survey, attribution } = source;
  return (
    <PublicForm
      key={token}
      token={token}
      surveyor={{ username: attribution.username, fullName: attribution.fullName }}
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
