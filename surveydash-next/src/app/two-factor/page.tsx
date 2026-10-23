import { TwoFactorChallenge } from '@/components/two-factor-challenge';
export const metadata = {
  title: 'Verifikasi login — SurveyDash Studio',
  robots: { index: false, follow: false },
};
export default async function TwoFactorPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <TwoFactorChallenge next={(await searchParams).next} />;
}
