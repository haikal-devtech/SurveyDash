'use client';
import { workspaceFetch } from '@/lib/workspace-request';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, WandSparkles, Copy, Archive, ArchiveRestore, Loader2, ArrowRight } from 'lucide-react';
import type { Survey, SurveyInsights } from '@/lib/types';
import { presentationPreflight } from '@/lib/presentation-preflight';
import {
  themes,
  type PresentationDocument,
  type PresentationTheme,
  type SlideSection,
} from '@/lib/presentation-model';
import { SlideThumbnail } from './slide-renderer';
import { Button, Badge, Modal } from './ui';
const sections: [SlideSection, string][] = [
  ['cover', 'Sampul'],
  ['summary', 'Ringkasan'],
  ['demographic', 'Profil responden'],
  ['ikm', 'Nilai IKM'],
  ['charts', 'Distribusi jawaban'],
  ['conclusion', 'Kesimpulan'],
];
export function PresentationHub({
  survey,
  initialGenerate = false,
}: {
  survey: Survey;
  initialGenerate?: boolean;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<PresentationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'blank' | 'generate' | null>(initialGenerate ? 'generate' : null);
  const [title, setTitle] = useState(survey.title);
  const [theme, setTheme] = useState<PresentationTheme>('professional');
  const [selected, setSelected] = useState<SlideSection[]>([
    'cover',
    'summary',
    'demographic',
    ...(survey.kind === 'skm' ? ['ikm' as const] : []),
    'charts',
    'conclusion',
  ]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [archive, setArchive] = useState<PresentationDocument | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [insights, setInsights] = useState<SurveyInsights | null>(null);
  const [preflightError, setPreflightError] = useState('');
  const [preflightEpoch, setPreflightEpoch] = useState(0);
  const preflight = insights ? presentationPreflight(survey, insights, selected) : [];
  useEffect(() => {
    if (mode !== 'generate') return;
    const controller = new AbortController();
    workspaceFetch('/api/surveys/' + survey.id + '/insights', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setInsights(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setPreflightError(error instanceof Error ? error.message : 'Sumber data gagal dimuat.');
      });
    return () => controller.abort();
  }, [mode, survey.id, preflightEpoch]);
  const visible = documents.filter((item) => (showArchived ? !!item.archivedAt : !item.archivedAt));
  useEffect(() => {
    const controller = new AbortController();
    workspaceFetch(`/api/presentations?surveyId=${survey.id}&archived=include`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setDocuments(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [survey.id]);
  function beginGeneration() {
    setInsights(null);
    setPreflightError('');
    setMode('generate');
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (mode === 'generate' && !insights) return;
    setPending(true);
    setError('');
    try {
      const response = await workspaceFetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          title,
          theme,
          sections: mode === 'blank' ? [] : selected,
        }),
      });
      const document = await response.json();
      if (!response.ok) throw new Error(document.error);
      router.push(`/studio/${survey.id}/presentations/${document.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Presentasi gagal dibuat.');
    } finally {
      setPending(false);
    }
  }
  async function manage(document: PresentationDocument, action: 'duplicate' | 'archive' | 'unarchive') {
    setPending(true);
    setError('');
    try {
      const response = await workspaceFetch(`/api/presentations/${document.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === 'duplicate') setDocuments((items) => [data, ...items]);
      else setDocuments((items) => items.map((item) => (item.id === document.id ? data : item)));
      setArchive(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal mengelola presentasi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="presentation-hub">
      <div className="panel-intro">
        <div>
          <h2>Studio presentasi.</h2>
          <p>Buat dokumen slide yang terhubung dengan hasil survei.</p>
        </div>
        <div className="actions">
          <Button permission="edit" variant="secondary" onClick={() => setMode('blank')}>
            <Plus size={14} />
            Presentasi kosong
          </Button>
          <Button permission="edit" onClick={beginGeneration}>
            <WandSparkles size={14} />
            Buat dari analisis
          </Button>
        </div>
      </div>
      <div className="tabs-filter" style={{ marginBottom: 22 }}>
        <button
          aria-pressed={!showArchived}
          className={!showArchived ? 'active' : ''}
          onClick={() => setShowArchived(false)}
        >
          Dokumen aktif
        </button>
        <button
          aria-pressed={showArchived}
          className={showArchived ? 'active' : ''}
          onClick={() => setShowArchived(true)}
        >
          Arsip ({documents.filter((d) => d.archivedAt).length})
        </button>
      </div>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="template-safe-note" role="status">
          Memuat presentasi…
        </p>
      ) : visible.length ? (
        <div className="presentation-documents">
          {visible.map((document) => (
            <article className="card presentation-document" key={document.id}>
              <div>
                <SlideThumbnail slide={document.slides[0]} />
                <h3>{document.title}</h3>
              </div>
              <div className="actions">
                <Badge>{document.slides.length} slide</Badge>
                {document.demo && <Badge>Data simulasi</Badge>}
              </div>
              <div className="presentation-document-actions">
                {!document.archivedAt && (
                  <Link className="text-link" href={`/studio/${survey.id}/presentations/${document.id}`}>
                    Buka editor
                    <ArrowRight size={13} />
                  </Link>
                )}
                {document.archivedAt && (
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void manage(document, 'unarchive')}
                  >
                    <ArchiveRestore size={14} />
                    Pulihkan
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Duplikat presentasi ${document.title}`}
                  permission="edit"
                  onClick={() => void manage(document, 'duplicate')}
                >
                  <Copy size={14} />
                </Button>
                {!document.archivedAt && (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    aria-label={`Arsipkan presentasi ${document.title}`}
                    permission="edit"
                    onClick={() => setArchive(document)}
                  >
                    <Archive size={14} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="presentation-start">
          <WandSparkles size={26} />
          <h3>{showArchived ? 'Arsip masih kosong.' : 'Dari insight menjadi cerita.'}</h3>
          <p>
            Pilih susunan slide, tema, dan grafik. Setiap dokumen dapat diedit tanpa mengubah form atau
            jawaban.
          </p>
        </div>
      )}
      {mode && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setMode(null);
          }}
          title={mode === 'generate' ? 'Buat presentasi dari analisis' : 'Presentasi kosong'}
          description="Dokumen baru dibuat terpisah dari presentasi yang sudah ada."
          wide
        >
          <form onSubmit={create}>
            <div className="field">
              <label htmlFor="presentation-title">Nama presentasi</label>
              <input
                id="presentation-title"
                className="input"
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <span className="label">Tema slide</span>
              <div className="presentation-theme-picker" role="group" aria-label="Tema slide">
                {Object.entries(themes).map(([id, value]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={theme === id}
                    onClick={() => setTheme(id as PresentationTheme)}
                  >
                    <span className="presentation-theme-swatch" style={{ background: value.background }}>
                      <i style={{ background: value.accent }} />
                      <b style={{ background: value.ink }} />
                    </span>
                    {value.name}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'generate' && (
              <fieldset className="generation-sections">
                <legend className="label">Isi presentasi</legend>
                {sections.map(([id, label]) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      disabled={id === 'ikm' && survey.kind !== 'skm'}
                      onChange={(e) =>
                        setSelected((items) =>
                          e.target.checked ? [...items, id] : items.filter((item) => item !== id),
                        )
                      }
                    />
                    {label}
                    {id === 'ikm' && survey.kind !== 'skm' && (
                      <small>Nilai IKM tidak tersedia untuk survei kustom</small>
                    )}
                  </label>
                ))}
              </fieldset>
            )}
            {mode === 'generate' && (
              <section className="generation-preflight" aria-live="polite">
                <h3>Tinjau sumber data</h3>
                {preflightError ? (
                  <div role="alert">
                    <p>{preflightError}</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPreflightError('');
                        setPreflightEpoch((value) => value + 1);
                      }}
                    >
                      Coba lagi
                    </Button>
                  </div>
                ) : !insights ? (
                  <p role="status">Memeriksa jawaban tersimpan…</p>
                ) : (
                  <dl>
                    {preflight.map((item) => (
                      <div key={item.section}>
                        <dt>
                          {item.title}{' '}
                          <Badge tone={item.status === 'ready' ? 'green' : 'amber'}>
                            {item.status === 'ready' ? 'Siap' : 'Perlu ditinjau'}
                          </Badge>
                        </dt>
                        <dd>{item.detail}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )}
            <div className="banner">
              Grafik memakai respons tersimpan. Bagian yang belum memiliki data akan diberi keterangan.{' '}
              {survey.demo ? 'Sumber ini berisi data simulasi.' : ''}
            </div>
            {error && (
              <div className="banner banner-error" role="alert">
                {error}
              </div>
            )}
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setMode(null)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={pending || (mode === 'generate' && (!selected.length || !insights))}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}Buat
                presentasi
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {archive && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setArchive(null);
          }}
          title="Arsipkan presentasi?"
          description={archive.title}
        >
          <p className="template-safe-note">
            Dokumen disimpan sebagai arsip dan link berbagi dicabut. Setelah dipulihkan, Anda dapat
            membagikannya lagi dengan link baru. Form dan jawaban survei tetap tersedia.
          </p>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setArchive(null)}>
              Batal
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => void manage(archive, 'archive')}>
              Arsipkan
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
