import { api, requireUser } from '@/lib/http';
import { getAccountRole } from '@/lib/account-repository';
export async function GET() {
  return api(async () => {
    const user = await requireUser();
    const role = await getAccountRole(user.id);
    return { role, destination: role === 'surveyor' ? '/surveyor' : '/studio' };
  });
}
