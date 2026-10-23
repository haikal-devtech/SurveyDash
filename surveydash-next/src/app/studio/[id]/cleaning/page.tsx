import Link from 'next/link';
import { requireWorkspacePage as requireWorkspaceUser } from '@/lib/workspace-page';
import { getSurvey } from '@/lib/repository';
import { CleaningPanel } from '@/components/cleaning-panel';
import { notFound } from 'next/navigation';
export default async function SurveyCleaning({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWorkspaceUser({ area: 'field' });
  let survey;
  try {
    survey = await getSurvey((await params).id, user.ownerId);
  } catch {
    notFound();
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="text-link" href="/studio/cleaning">
            ← Semua survei
          </Link>
          <h1>{survey.title}</h1>
          <p>Tinjauan data pada workspace yang Anda kelola.</p>
        </div>
      </div>
      <CleaningPanel survey={survey} />
    </>
  );
}
