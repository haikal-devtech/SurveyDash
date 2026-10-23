'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { WorkspaceRole } from '@/lib/workspace-role-model';
const Permissions = createContext<WorkspaceRole>('owner');
export function WorkspacePermissions({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  return <Permissions.Provider value={role}>{children}</Permissions.Provider>;
}
export function useWorkspacePermissions() {
  const role = useContext(Permissions);
  return { role, canEdit: role === 'owner' || role === 'editor', canField: role !== 'viewer' };
}
