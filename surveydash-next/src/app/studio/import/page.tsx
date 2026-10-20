import { FormsImport } from '@/components/forms-import';
import { requireWorkspaceUser } from '@/lib/http';
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  await requireWorkspaceUser();
  const parameters = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Impor Google Form</h1>
          <p>Bawa pertanyaan dan jawaban lama ke survei baru.</p>
        </div>
      </div>
      <FormsImport googleFailed={parameters.google === 'failed'} />
    </>
  );
}
