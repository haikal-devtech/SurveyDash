import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { fieldworkOverview } from '@/lib/fieldwork-repository';
import { FieldworkPanel } from '@/components/fieldwork-panel';
export default async function FieldworkPage() {
  const user = await requireWorkspaceUser({ area: 'field' });
  return (
    <FieldworkPanel
      initialData={await fieldworkOverview(user.ownerId, ['owner', 'editor'].includes(user.workspaceRole))}
      role={user.workspaceRole}
    />
  );
}
