import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listTemplates } from '@/lib/repository';
import { TemplateLibrary } from '@/components/template-library';
export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return <TemplateLibrary saved={await listTemplates(session.user.id)} />;
}
