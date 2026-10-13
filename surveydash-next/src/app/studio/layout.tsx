import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Shell } from '@/components/shell';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return <Shell name={session.user.name}>{children}</Shell>;
}
