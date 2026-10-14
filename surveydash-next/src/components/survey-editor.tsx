'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Table2,
  BarChart3,
  PanelsTopLeft,
  Settings2,
  Play,
  Loader2,
  Bookmark,
  X,
  Info,
} from 'lucide-react';
import type { Survey, SurveyInsights, TemplateCategory } from '@/lib/types';
import { Button, Badge, FullscreenDialog } from './ui';
import { FormBuilder } from './form-builder';
import { QuestionInput } from './question-input';
import { ResponseTable } from './response-table';
import { SaveTemplateDialog } from './save-template-dialog';
import { PresentationTemplatePicker } from './presentation-template-picker';
import { SettingsPanel } from './settings-panel';
import { AnalyticsPanel } from './analytics-panel';
import { PresentationHub } from './presentation-hub';
const DashboardCanvas = dynamic(() => import('./dashboard-canvas').then((m) => m.DashboardCanvas), {
  ssr: false,
  loading: () => (
    <div className="empty-state">
      <Loader2 className="animate-spin" size={24} />
      <p>Menyiapkan kanvas…</p>
    </div>
  ),
});

const tabs = [
  { id: 'questions', label: 'Pertanyaan', icon: FileText },
  { id: 'form', label: 'Form', icon: ExternalLink },
  { id: 'data', label: 'Data', icon: Table2 },
  { id: 'analytics', label: 'Analisis', icon: BarChart3 },
  { id: 'presentation', label: 'Presentasi', icon: PanelsTopLeft },
  { id: 'settings', label: 'Pengaturan', icon: Settings2 },
];
export function SurveyEditor({ initialSurvey }: { initialSurvey: Survey }) {
  const router = useRouter();
  const [survey, setSurvey] = useState(initialSurvey);
  const [insights, setInsights] = useState<SurveyInsights | null>(null);
  const [insightsKey, setInsightsKey] = useState('');
  const [insightsFailure, setInsightsFailure] = useState<{ key: string; message: string } | null>(null);
  const [insightsEpoch, setInsightsEpoch] = useState(0);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [generateFromAnalysis, setGenerateFromAnalysis] = useState(false);
  const [tab, setTab] = useState('questions');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | null>(null);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string | string[] | number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSurvey = useRef(survey);
  const saving = useRef(false);
  const responseCount = survey.responseCount ?? 0;
  const needsInsights = tab === 'analytics' || (tab === 'presentation' && dashboardOpen) || presenting;
  const includeSamples = dashboardOpen || presenting;
  const requestKey = survey.id + ':' + survey.version + ':' + insightsEpoch + ':' + includeSamples;
  const insightsError = insightsFailure?.key === requestKey ? insightsFailure.message : '';
  const insightsLoading = needsInsights && insightsKey !== requestKey && !insightsError;
  useEffect(() => {
    if (!needsInsights) return;
    const controller = new AbortController();
    fetch('/api/surveys/' + survey.id + '/insights?samples=' + includeSamples, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setInsights(data);
          setInsightsKey(requestKey);
          setInsightsFailure(null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setInsightsFailure({
            key: requestKey,
            message: error instanceof Error ? error.message : 'Analisis gagal dimuat.',
          });
      });
    return () => controller.abort();
  }, [needsInsights, survey.id, requestKey, includeSamples]);
  const insightsStatus = insightsError ? (
    <div className="empty-state" role="alert">
      <p>{insightsError}</p>
      <Button variant="secondary" onClick={() => setInsightsEpoch((value) => value + 1)}>
        Coba lagi
      </Button>
    </div>
  ) : (
    <div className="empty-state" role="status">
      <Loader2 size={22} className="animate-spin" />
      <p>Menyiapkan analisis…</p>
    </div>
  );
  function notify(message: string) {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 4000);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (e.key === 'Escape') setPresenting(false);
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
  function change(next: Survey) {
    latestSurvey.current = next;
    setSurvey(next);
    setDirty(true);
    setError('');
  }
  async function save(next = latestSurvey.current, quiet = false) {
    if (saving.current) return false;
    saving.current = true;
    const atStart = latestSurvey.current;
    setPending(true);
    setError('');
    try {
      const resp = await fetch(`/api/surveys/${survey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      if (latestSurvey.current === atStart) {
        latestSurvey.current = data;
        setSurvey(data);
        setDirty(false);
      } else {
        const merged = {
          ...latestSurvey.current,
          version: data.version,
          status: latestSurvey.current.status === atStart.status ? data.status : latestSurvey.current.status,
        };
        latestSurvey.current = merged;
        setSurvey(merged);
        setDirty(true);
      }
      if (!quiet) notify('Perubahan tersimpan.');
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan.');
      return false;
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  async function refresh() {
    if (dirty) {
      notify('Simpan perubahan sebelum memuat ulang data.');
      return;
    }
    setPending(true);
    try {
      const resp = await fetch(`/api/surveys/${survey.id}?view=metadata`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setSurvey(data.survey);
      latestSurvey.current = data.survey;
      setInsightsEpoch((value) => value + 1);
      setError('');
      notify('Data terbaru sudah dimuat.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal memuat data.');
    } finally {
      setPending(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${survey.token}`);
      notify('Link form disalin.');
    } catch {
      setError('Tidak dapat menyalin link. Buka form lalu salin alamatnya.');
    }
  }
  const autoSave = useEffectEvent(() => {
    void save(latestSurvey.current, true);
  });
  useEffect(() => {
    if (!dirty || pending || error) return;
    const autosave = setTimeout(autoSave, 900);
    return () => clearTimeout(autosave);
  }, [survey, dirty, pending, error]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    void fetch(`/api/surveys/${initialSurvey.id}/manage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'opened' }),
    });
  }, [initialSurvey.id]);
  return (
    <>
      <div className="editor-header">
        <Link
          className="back-link"
          href="/studio"
          onClick={(event) => {
            if (dirty) {
              event.preventDefault();
              void save().then((ok) => {
                if (ok) router.push('/studio');
              });
            }
          }}
        >
          <ArrowLeft size={13} />
          Semua survei
        </Link>
        <div className="editor-heading">
          <div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
              <Badge
                tone={survey.status === 'open' ? 'green' : survey.status === 'draft' ? 'amber' : 'neutral'}
              >
                {survey.status === 'open'
                  ? '● Menerima jawaban'
                  : survey.status === 'draft'
                    ? 'Draft'
                    : 'Form ditutup'}
              </Badge>
              {survey.demo && <Badge>Data simulasi</Badge>}
              {dirty && <Badge tone="amber">Belum disimpan</Badge>}
              <Badge tone={error && dirty ? 'amber' : 'green'}>
                {pending
                  ? 'Menyimpan…'
                  : error && dirty
                    ? 'Gagal menyimpan'
                    : dirty
                      ? 'Menunggu autosave'
                      : 'Tersimpan'}
              </Badge>
            </div>
            <h1>{survey.title}</h1>
            <p>
              {survey.institution || 'Instansi belum diatur'} · {responseCount} responden ·{' '}
              {survey.questions.length} pertanyaan
            </p>
          </div>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                setTemplateCategory(
                  tab === 'presentation'
                    ? 'presentation'
                    : tab === 'questions' || tab === 'form'
                      ? 'form'
                      : 'survey',
                )
              }
            >
              <Bookmark size={13} />
              Simpan template
            </Button>
            <Button variant="secondary" onClick={() => setPresenting(true)}>
              <Play size={13} />
              Presentasikan
            </Button>
            <Button onClick={() => void save()} disabled={pending || !dirty}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Simpan perubahan
            </Button>
          </div>
        </div>
        <nav className="editor-tabs" aria-label="Bagian survei">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                setGenerateFromAnalysis(false);
                setTab(t.id);
              }}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {error && (
        <div role="alert" className="banner banner-error">
          {error}
        </div>
      )}
      {tab === 'questions' && (
        <FormBuilder survey={survey} hasResponses={responseCount > 0} onChange={change} />
      )}
      {tab === 'form' && (
        <>
          <div className="panel-intro">
            <div>
              <h2>Form yang siap menemui responden.</h2>
              <p>Preview interaktif · Jawaban di preview tidak dikirim ke database.</p>
            </div>
            <div className="actions">
              <Button
                variant="secondary"
                onClick={copyLink}
                disabled={survey.status === 'draft' || survey.visibility === 'private'}
              >
                <Copy size={13} />
                Salin link
              </Button>
              {survey.status === 'draft' ? (
                <Button onClick={() => void save({ ...survey, status: 'open' })} disabled={pending}>
                  Buka form
                  <ExternalLink size={13} />
                </Button>
              ) : survey.visibility !== 'private' ? (
                <Link className="btn btn-primary" href={`/f/${survey.token}`} target="_blank">
                  Buka form
                  <ExternalLink size={13} />
                </Link>
              ) : (
                <Badge>Form privat</Badge>
              )}
            </div>
          </div>
          <div className="form-preview">
            <div className="card form-cover">
              <p className="eyebrow">{survey.institution || 'SURVEYDASH STUDIO'}</p>
              <h1>{survey.title}</h1>
              <p>{survey.description}</p>
            </div>
            {survey.questions.map((q) => (
              <QuestionInput
                key={q.id}
                question={q}
                value={previewValues[q.id]}
                onChange={(value) => setPreviewValues((v) => ({ ...v, [q.id]: value }))}
              />
            ))}
          </div>
        </>
      )}
      {tab === 'data' && (
        <ResponseTable
          survey={survey}
          onRefresh={refresh}
          onEdited={() => {
            setInsightsEpoch((value) => value + 1);
            notify('Jawaban diperbarui. Riwayat koreksi tersimpan.');
          }}
          onError={setError}
        />
      )}
      {tab === 'analytics' &&
        (insightsLoading || !insights || insightsError ? (
          insightsStatus
        ) : (
          <AnalyticsPanel
            survey={survey}
            insights={insights}
            onRefresh={refresh}
            onGenerate={() => {
              setGenerateFromAnalysis(true);
              setTab('presentation');
            }}
          />
        ))}
      {tab === 'presentation' && (
        <>
          <PresentationHub survey={survey} initialGenerate={generateFromAnalysis} />
          <details
            className="dashboard-layout-details"
            onToggle={(event) => setDashboardOpen(event.currentTarget.open)}
          >
            <summary>Kanvas dashboard satu halaman</summary>
            <div className="panel-intro">
              <div>
                <h2>Susun cerita di balik data.</h2>
                <p>Seret pertanyaan ke kanvas. Atur jenis grafik, posisi, dan ukuran.</p>
              </div>
              <div className="actions">
                <Button variant="secondary" onClick={() => setTemplatePicker(true)}>
                  <Bookmark size={13} />
                  Pakai template
                </Button>
                <Button variant="secondary" onClick={() => setPresenting(true)}>
                  <Play size={13} />
                  Mode presentasi
                </Button>
              </div>
            </div>
            {dashboardOpen &&
              (insightsLoading || !insights || insightsError ? (
                insightsStatus
              ) : (
                <DashboardCanvas survey={survey} insights={insights} onChange={change} editing />
              ))}
          </details>
        </>
      )}
      {tab === 'settings' && (
        <SettingsPanel
          survey={survey}
          onChange={change}
          onSave={save}
          onTemplate={() => setTemplateCategory('survey')}
          onCopy={copyLink}
          pending={pending}
        />
      )}
      <FullscreenDialog open={presenting} onOpenChange={setPresenting} title="Presentasi hasil survei">
        <div className="editor-heading">
          <div>
            <Badge tone="purple">HASIL SURVEI{survey.demo ? ' · DATA SIMULASI' : ''}</Badge>
            <h1 style={{ marginTop: 14, fontSize: 29 }}>{survey.title}</h1>
            <p>
              {survey.institution} · {responseCount} responden
            </p>
          </div>
          <div className="actions presentation-controls">
            <Button variant="secondary" onClick={() => window.print()}>
              Cetak / PDF
            </Button>
            <Button variant="secondary" onClick={() => setPresenting(false)}>
              <X size={15} />
              Keluar
            </Button>
          </div>
        </div>
        {dirty && (
          <div className="banner presentation-controls">
            <Info size={13} />
            Layout ini belum disimpan.
          </div>
        )}
        {insightsLoading || !insights || insightsError ? (
          insightsStatus
        ) : (
          <DashboardCanvas survey={survey} insights={insights} editing={false} />
        )}
      </FullscreenDialog>
      {templateCategory && (
        <SaveTemplateDialog
          survey={survey}
          initialCategory={templateCategory}
          onClose={() => setTemplateCategory(null)}
          onSaved={() => notify('Template tersimpan di pustaka workspace.')}
        />
      )}
      {templatePicker && (
        <PresentationTemplatePicker
          survey={survey}
          onClose={() => setTemplatePicker(false)}
          onApply={(widgets) => {
            change({ ...survey, widgets });
            notify('Template diterapkan ke editor. Simpan perubahan untuk menyimpan susunannya.');
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={13} style={{ display: 'inline', marginRight: 8 }} />
          {notice}
        </div>
      )}
    </>
  );
}
