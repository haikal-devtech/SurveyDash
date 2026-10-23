export const workspaceRoles = ['editor', 'viewer', 'coordinator'] as const;
export type WorkspaceRole = 'owner' | (typeof workspaceRoles)[number];
export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: 'Pemilik',
  editor: 'Editor',
  viewer: 'Pembaca',
  coordinator: 'Koordinator lapangan',
};
