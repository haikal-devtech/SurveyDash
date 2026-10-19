import { api, requireSurveyorUser } from '@/lib/http';
import { getSurveyorProfile } from '@/lib/account-repository';
import { listSurveyorAssignments } from '@/lib/surveyor-repository';
export async function GET() {
  return api(async () => {
    const user = await requireSurveyorUser();
    const [profile, assignments] = await Promise.all([
      getSurveyorProfile(user.id),
      listSurveyorAssignments(user.id),
    ]);
    return { profile, assignments };
  });
}
