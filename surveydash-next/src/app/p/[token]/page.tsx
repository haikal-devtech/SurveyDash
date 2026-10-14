import { notFound } from 'next/navigation';
import { getSharedPresentation } from '@/lib/share-repository';
import { SharedViewer } from '@/components/shared-viewer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Presentasi dibagikan — SurveyDash Studio',
  robots: { index: false, follow: false },
};
export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let snapshot;
  try {
    snapshot = await getSharedPresentation(token);
  } catch {
    notFound();
  }
  return <SharedViewer token={token} initialSnapshot={snapshot} />;
}
