import Link from 'next/link';
import { listPublicSurveys } from '@/lib/repository';
import { Brand } from '@/components/brand';
import { Badge, EmptyState } from '@/components/ui';
import { ClipboardList, ArrowRight } from 'lucide-react';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function PublicSurveysPage() {
  const surveys = await listPublicSurveys();
  return (
    <main className="public-shell">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 55 }}
        >
          <Brand />
          <Link href="/studio" className="btn btn-secondary">
            Masuk workspace
            <ArrowRight size={13} />
          </Link>
        </header>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Badge tone="purple">PORTAL RESPONDEN</Badge>
          <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1, marginTop: 18 }}>
            Suara Anda membantu kami berkembang.
          </h1>
          <p style={{ marginTop: 13, fontSize: 13, color: '#a58fb5' }}>
            Pilih survei yang tersedia dan bagikan pengalaman Anda.
          </p>
        </div>
        {surveys.length ? (
          <div className="survey-grid">
            {surveys.map((s) => (
              <Link className="survey-card" href={`/f/${s.token}`} key={s.token}>
                <div className="survey-card-top">
                  <span className="survey-icon">
                    <ClipboardList size={20} />
                  </span>
                  <Badge tone={s.status === 'open' ? 'green' : 'neutral'}>
                    {s.status === 'open' ? 'Menerima jawaban' : 'Ditutup'}
                  </Badge>
                </div>
                <h3>{s.title}</h3>
                <p className="institution">{s.institution}</p>
                <p className="hint">
                  {s.description.slice(0, 120)}
                  {s.description.length > 120 ? '…' : ''}
                </p>
                <div className="survey-footer">
                  <span>{s.demo ? 'Survei contoh' : 'Bagikan pengalaman Anda'}</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="card">
            <EmptyState
              icon={<ClipboardList size={25} />}
              title="Belum ada survei publik."
              description="Survei yang menggunakan akses link dapat dibuka melalui link yang diberikan administrator."
            />
          </section>
        )}
        <p className="public-footer">SurveyDash Studio · Ruang untuk setiap suara</p>
      </div>
    </main>
  );
}
