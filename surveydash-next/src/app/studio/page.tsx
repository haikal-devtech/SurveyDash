import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ensureDemoWorkspace, listSurveys, listTemplates, listSubmissions } from '@/lib/repository';
import { Overview } from '@/components/overview';
export default async function StudioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  await ensureDemoWorkspace(session.user.id);
  const surveys = await listSurveys(session.user.id);
  const rows = (await Promise.all(surveys.map((s) => listSubmissions(s.id)))).flat();
  return (
    <Overview
      surveys={surveys}
      templates={await listTemplates(session.user.id)}
      submissions={rows}
      name={session.user.name}
    />
  );
}
