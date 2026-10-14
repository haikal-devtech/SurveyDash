import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getWorkspace } from '@/lib/workspace-repository';
import { SettingsForm } from '@/components/settings-forms';
export default async function WorkspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const workspace = await getWorkspace(workspaceUser.ownerId);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Identitas workspace.</h1>
          <p>Atur nama dan deskripsi ruang kerja Anda.</p>
        </div>
      </div>
      <SettingsForm
        type="workspace"
        initialName={workspace.name}
        initialDescription={workspace.description}
      />
    </>
  );
}
