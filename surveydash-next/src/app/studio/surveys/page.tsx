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
  const [surveys, templates, query] = await Promise.all([
    listSurveys(session.user.id, true),
    listTemplates(session.user.id),
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
