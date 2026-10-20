'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  FileText,
  ClipboardCheck,
  Users,
  UsersRound,
  Grid2X2,
  ArrowRight,
  Loader2,
  ListChecks,
  MessageSquare,
} from 'lucide-react';
import type { SavedTemplate, Survey } from '@/lib/types';
import { CreateSurvey } from './create-survey';
import { SurveyExplorer } from './survey-explorer';
import { Button } from './ui';
import { GuideButton } from './role-guide';
import { useRouter } from 'next/navigation';
import '@/app/manager-surveyors.css';
const starters = [
  {
    id: 'skm',
    title: 'Survei Kepuasan Masyarakat',
    description: '9 unsur pelayanan dan IKM',
    icon: FileText,
  },
  { id: 'experience', title: 'Evaluasi Layanan', description: 'Cocok untuk instansi', icon: ClipboardCheck },
  { id: 'customer', title: 'Kepuasan Pelanggan', description: 'Untuk bisnis & UMKM', icon: Users },
];
export function Overview({
  surveys,
  templates,
  name,
  listOnly = false,
  initialQuery = '',
}: {
  surveys: Survey[];
  templates: SavedTemplate[];
  name: string;
  listOnly?: boolean;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const currentSurveys = surveys.filter((survey) => !survey.deletedAt && !survey.archivedAt);
  async function demo() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/surveys/demo', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal memuat contoh.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className={listOnly ? 'page-heading home-heading' : 'workspace-welcome'}>
        <div>
          <h1>{listOnly ? 'Semua survei Anda' : `Halo, ${name.split(' ')[0]}.`}</h1>
          <p>
            {listOnly
              ? 'Cari survei atau lanjutkan pekerjaan Anda.'
              : 'Buat survei baru atau lanjutkan pekerjaan Anda.'}
          </p>
          <div className="workspace-welcome-actions">
            <Button data-tour="create-survey" onClick={() => setSelected('blank')}>
              <Plus size={17} />
              Buat survei
            </Button>
            {!listOnly && <GuideButton role="manager" />}
          </div>
        </div>
      </div>
      {!listOnly && (
        <>
          <section className="workspace-metrics" aria-label="Ringkasan survei">
            <Link href="/studio/surveys">
              <span>
                <FileText size={19} />
                Survei Anda
              </span>
              <strong>{currentSurveys.length.toLocaleString('id-ID')}</strong>
            </Link>
            <Link href="/studio/surveys">
              <span>
                <ClipboardCheck size={19} />
                Survei terbuka
              </span>
              <strong>
                {currentSurveys.filter((survey) => survey.status === 'open').length.toLocaleString('id-ID')}
              </strong>
            </Link>
            <Link href="/studio/surveys">
              <span>
                <MessageSquare size={19} />
                Total respons
              </span>
              <strong>
                {currentSurveys
                  .reduce((total, survey) => total + (survey.responseCount ?? 0), 0)
                  .toLocaleString('id-ID')}
              </strong>
            </Link>
          </section>
          <div className="workspace-shortcuts">
            <Link href="/studio/surveyors">
              <span className="shortcut-icon">
                <UsersRound size={22} />
              </span>
              <span>
                <strong>Kelola Surveyor</strong>
                <small>Undang dan lihat penugasan</small>
              </span>
              <ArrowRight size={17} />
            </Link>
            <Link href="/studio/cleaning">
              <span className="shortcut-icon">
                <ListChecks size={22} />
              </span>
              <span>
                <strong>Cleaning data</strong>
                <small>Tinjau respons mencurigakan</small>
              </span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </>
      )}
      {!listOnly && (
        <section className="starter-section">
          <div className="explorer-heading">
            <h2>Mulai dari template</h2>
            <Link href="/studio/templates" className="text-link">
              Lihat semua template <ArrowRight size={15} />
            </Link>
          </div>
          <div className="starter-tiles">
            {starters.map((item) => (
              <button
                className="starter-tile"
                type="button"
                key={item.id}
                onClick={() => setSelected(item.id)}
              >
                <span>
                  <item.icon size={25} />
                </span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </button>
            ))}
            <Link className="starter-tile" href="/studio/templates">
              <span>
                <Grid2X2 size={25} />
              </span>
              <strong>Lainnya</strong>
              <small>Lihat semua template</small>
            </Link>
          </div>
        </section>
      )}
      <SurveyExplorer
        key={surveys.map((s) => `${s.id}:${s.version}:${s.deletedAt ?? ''}`).join(',')}
        initialSurveys={surveys}
        compact={!listOnly}
        initialQuery={initialQuery}
      />
      {!surveys.length && !listOnly && (
        <div className="demo-start">
          <p>Ingin melihat alur lengkap terlebih dahulu?</p>
          <Button variant="secondary" disabled={pending} onClick={() => void demo()}>
            {pending && <Loader2 className="animate-spin" size={14} />}Coba contoh SKM
          </Button>
          <small>Contoh menggunakan 48 respons simulasi yang diberi label.</small>
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      {selected && (
        <CreateSurvey
          key={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          initialTemplate={selected}
          templates={templates}
        />
      )}
    </>
  );
}
