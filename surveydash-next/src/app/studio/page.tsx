import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listSurveys, listTemplates } from '@/lib/repository';
import { Overview } from '@/components/overview';
export default async function StudioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const surveys = await listSurveys(session.user.id, true);
  return (
    <Overview surveys={surveys} templates={await listTemplates(session.user.id)} name={session.user.name} />
  );
}
