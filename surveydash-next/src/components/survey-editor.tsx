'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  Loader2,
  Bookmark,
  X,
  Info,
} from 'lucide-react';
import type { AuditEntry, Submission, Survey } from '@/lib/types';
import { calculateStats } from '@/lib/model';
import { Button, Badge, Modal, FullscreenDialog } from './ui';
import { FormBuilder } from './form-builder';
import { QuestionInput } from './question-input';
import { ResponseTable } from './response-table';
import { SettingsPanel } from './settings-panel';
import { AnalyticsPanel } from './analytics-panel';
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
export function SurveyEditor({
  initialSurvey,
  initialSubmissions,
  initialAudit,
}: {
  initialSurvey: Survey;
  initialSubmissions: Submission[];
  initialAudit: AuditEntry[];
}) {
  const [survey, setSurvey] = useState(initialSurvey);
  const [rows, setRows] = useState(initialSubmissions);
  const [audit, setAudit] = useState(initialAudit);
  const [tab, setTab] = useState('analytics');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, string | string[] | number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stats = useMemo(() => calculateStats(survey, rows), [survey, rows]);
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
    setSurvey(next);
    setDirty(true);
    setError('');
  }
  async function save(next = survey) {
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
      setSurvey(data);
      setDirty(false);
      notify('Perubahan tersimpan.');
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan.');
      return false;
    } finally {
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
      const resp = await fetch(`/api/surveys/${survey.id}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setSurvey(data.survey);
      setRows(data.submissions);
      setAudit(data.audit);
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
  async function template() {
    setTemplateName(survey.title);
    setTemplateDialog(true);
  }
  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    const name = templateName.trim();
    if (!name) return;
    if (dirty) {
      if (!(await save())) return;
    }
    setPending(true);
    try {
      const resp = await fetch(`/api/surveys/${survey.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'template', name }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setTemplateDialog(false);
      notify('Template tersimpan di pustaka workspace.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan template.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="editor-header">
        <Link className="back-link" href="/studio">
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
            </div>
            <h1>{survey.title}</h1>
            <p>
              {survey.institution || 'Instansi belum diatur'} · {rows.length} responden ·{' '}
              {survey.questions.length} pertanyaan
            </p>
          </div>
          <div className="actions">
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
              onClick={() => setTab(t.id)}
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
        <FormBuilder survey={survey} hasResponses={rows.length > 0} onChange={change} />
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
          rows={rows}
          audit={audit}
          onRefresh={refresh}
          onEdited={(row) => {
            setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
            notify('Jawaban diperbarui. Riwayat koreksi tersimpan.');
          }}
          onError={setError}
        />
      )}
      {tab === 'analytics' && (
        <AnalyticsPanel survey={survey} rows={rows} stats={stats} onRefresh={refresh} />
      )}
      {tab === 'presentation' && (
        <>
          <div className="panel-intro">
            <div>
              <h2>Susun cerita di balik data.</h2>
              <p>Seret pertanyaan ke kanvas. Atur jenis grafik, posisi, dan ukuran.</p>
            </div>
            <Button variant="secondary" onClick={() => setPresenting(true)}>
              <Play size={13} />
              Mode presentasi
            </Button>
          </div>
          <DashboardCanvas survey={survey} rows={rows} stats={stats} onChange={change} editing />
        </>
      )}
      {tab === 'settings' && (
        <SettingsPanel
          survey={survey}
          onChange={change}
          onSave={save}
          onTemplate={template}
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
              {survey.institution} · {rows.length} responden
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
        <DashboardCanvas survey={survey} rows={rows} stats={stats} editing={false} />
      </FullscreenDialog>
      <Modal
        open={templateDialog}
        onOpenChange={setTemplateDialog}
        title="Simpan template pertanyaan"
        description="Gunakan kembali struktur pertanyaan ini pada survei berikutnya."
      >
        <form onSubmit={saveTemplate}>
          <div className="field">
            <label htmlFor="template-name">Nama template</label>
            <input
              id="template-name"
              className="input"
              minLength={3}
              maxLength={200}
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          {error && (
            <div className="banner banner-error" role="alert" style={{ marginTop: 15 }}>
              {error}
            </div>
          )}
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setTemplateDialog(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              <Bookmark size={13} />
              Simpan template
            </Button>
          </div>
        </form>
      </Modal>
      {notice && (
        <div className="toast" role="status">
          <Check size={13} style={{ display: 'inline', marginRight: 8 }} />
          {notice}
        </div>
      )}
    </>
  );
}
