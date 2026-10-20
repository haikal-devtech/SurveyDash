import { listPublicSurveys } from '@/lib/repository';
import { RespondentPortal } from '@/components/respondent-portal';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daftar Survei | SurveyDash Studio' };
export default async function PublicSurveysPage() {
  return <RespondentPortal surveys={await listPublicSurveys()} />;
}
