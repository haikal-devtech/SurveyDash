export interface WorkspaceChoice {
  ownerId: string;
  name: string;
  ownerName: string;
  own: boolean;
}
export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  active: boolean;
}
export interface WorkspaceInvitation {
  url: string;
  expiresAt: string;
}
