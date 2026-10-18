import Link from 'next/link';
import { requireWorkspaceUser } from '@/lib/http';
import { listSurveys } from '@/lib/repository';
import { EmptyState } from '@/components/ui';
import { ListChecks, ArrowRight } from 'lucide-react';
export default async function CleaningHome() {
  const user = await requireWorkspaceUser();
  const surveys = await listSurveys(user.ownerId);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cleaning data.</h1>
          <p>Pilih survei untuk memeriksa kemiripan nama, rekening jika ditanyakan, dan pola jawaban.</p>
        </div>
      </div>
      <p className="banner">
        Indikasi kemiripan memerlukan pemeriksaan manusia. Data asli dan perhitungan tidak dihapus atau diubah
        otomatis.
      </p>
      {surveys.length ? (
        <div className="settings-links">
          {surveys.map((survey) => (
            <Link key={survey.id} href={'/studio/' + survey.id + '/cleaning'} className="card settings-link">
              <ListChecks size={22} />
              <div>
                <h3>{survey.title}</h3>
                <p>{survey.responseCount ?? 0} respons · Tetapkan kolom identitas dan tinjau temuan.</p>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <section className="card">
          <EmptyState
            icon={<ListChecks size={24} />}
            title="Belum ada survei untuk ditinjau."
            description="Buat survei dan kumpulkan respons, lalu buka halaman ini."
          />
        </section>
      )}
    </>
  );
}
