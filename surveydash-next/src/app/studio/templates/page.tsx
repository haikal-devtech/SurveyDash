import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listTemplates, listSurveys } from '@/lib/repository';
import { TemplateLibrary } from '@/components/template-library';
export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const [saved, surveys] = await Promise.all([listTemplates(session.user.id, true), listSurveys(session.user.id)]);
  return <TemplateLibrary saved={saved} surveys={surveys} />;
}
