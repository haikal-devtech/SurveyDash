import { FormsImport } from '@/components/forms-import';
export default function ImportPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Impor instrumen survei.</h1>
          <p>Tinjau pertanyaan sebelum membuat salinan di workspace.</p>
        </div>
      </div>
      <FormsImport />
    </>
  );
}
