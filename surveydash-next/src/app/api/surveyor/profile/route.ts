import { api, checkOrigin, readJson, requireSurveyorUser } from '@/lib/http';
import { updateSurveyorProfile } from '@/lib/account-repository';
export async function POST(request: Request) {
  return api(async () => {
    checkOrigin(request);
    const user = await requireSurveyorUser();
    return updateSurveyorProfile(user.id, await readJson(request, 12000));
  }, '/api/surveyor/profile');
}
