import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { requireWorkspaceUser } from '@/lib/http';
import { listAdminWorkspaces } from '@/lib/access-repository';
import { AdminWorkspaces } from '@/components/admin-workspaces';
export default async function AdminPage() {
  if (!(await auth.api.getSession({ headers: await headers() }))) redirect('/login');
  const user = await requireWorkspaceUser();
  if (!user.isAdmin) redirect('/studio');
  return <AdminWorkspaces rows={await listAdminWorkspaces(user.id)} currentOwnerId={user.ownerId} />;
}
