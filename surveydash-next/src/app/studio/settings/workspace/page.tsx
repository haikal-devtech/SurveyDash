import { requireWorkspaceUser } from '@/lib/http';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getWorkspace } from '@/lib/workspace-repository';
import { SettingsForm } from '@/components/settings-forms';
import { WorkspaceTeamPanel } from '@/components/workspace-team-panel';
import { canManageWorkspaceTeam, listWorkspaceMembers, getWorkspaceInvitation } from '@/lib/workspace-team';
export default async function WorkspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const workspaceUser = await requireWorkspaceUser();
  const workspace = await getWorkspace(workspaceUser.ownerId);
  const canManage = await canManageWorkspaceTeam(workspaceUser.id, workspaceUser.ownerId);
  const team = canManage
    ? {
        members: await listWorkspaceMembers(workspaceUser.ownerId, workspaceUser.id),
        invitation: await getWorkspaceInvitation(workspaceUser.ownerId, workspaceUser.id),
      }
    : null;
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
      {team ? (
        <WorkspaceTeamPanel initialMembers={team.members} initialInvitation={team.invitation} />
      ) : (
        <p className="hint">Workspace bersama. Pemilik mengatur undangan dan anggota.</p>
      )}
    </>
  );
}
