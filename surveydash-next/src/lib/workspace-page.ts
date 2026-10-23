import { redirect } from 'next/navigation';
import { requireWorkspaceUser } from './http';
import { AppError } from './repository';
/** Page navigation recovers to an allowed entry point; API handlers keep explicit 401/403. */
export async function requireWorkspacePage(options: Parameters<typeof requireWorkspaceUser>[0] = {}) {
  try {
    return await requireWorkspaceUser(options);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login');
    if (error instanceof AppError && error.status === 403) redirect('/studio');
    throw error;
  }
}
