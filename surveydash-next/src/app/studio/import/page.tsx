import { FormsImport } from '@/components/forms-import';
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const parameters = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Impor instrumen survei.</h1>
          <p>Tinjau pertanyaan sebelum membuat salinan di workspace.</p>
        </div>
      </div>
      <FormsImport googleFailed={parameters.google === 'failed'} />
    </>
  );
}
