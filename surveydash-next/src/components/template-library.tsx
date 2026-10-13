'use client';
import { useState } from 'react';
import {
  ClipboardList,
  Plus,
  ArrowRight,
  Bookmark,
  LayoutTemplate,
  Layers3,
  Search,
  Eye,
  Copy,
  Pencil,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import { systemTemplates, templateLabels } from '@/lib/template-model';
import type { SavedTemplate, Survey, TemplateCategory } from '@/lib/types';
import { CreateSurvey } from './create-survey';
import { SaveTemplateDialog } from './save-template-dialog';
import { ApplyPresentationDialog } from './apply-presentation-dialog';
import { Badge, Button, EmptyState, Modal } from './ui';
import { SlideThumbnail } from './slide-renderer';

const icons = { form: ClipboardList, presentation: LayoutTemplate, survey: Layers3 };
const widgetLabels = {
  pie: 'Pie chart',
  bar: 'Bar chart',
  table: 'Tabel',
  metric: 'Kartu angka',
  text: 'Catatan',
};
function TemplatePreview({ template, onClose }: { template: SavedTemplate; onClose: () => void }) {
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Pratinjau template"
      description={template.name}
      wide
    >
      <div className="actions">
        <Badge tone="purple">{templateLabels[template.category]}</Badge>
        <Badge>{template.builtIn ? 'Bawaan' : 'Workspace Anda'}</Badge>
      </div>
      {template.description && <p className="template-safe-note">{template.description}</p>}
      {template.category !== 'presentation' && (
        <section className="template-preview-section">
          <h3>Form · {template.questions.length} pertanyaan</h3>
          {template.settings.institution && <p className="hint">{template.settings.institution}</p>}
          {template.settings.description && (
            <p className="template-safe-note">{template.settings.description}</p>
          )}
          <ol className="template-question-preview">
            {template.questions.map((q) => (
              <li key={q.id}>
                <strong>
                  {q.label}
                  {q.required ? ' *' : ''}
                </strong>
                {q.description && <p>{q.description}</p>}
                <div>
                  {q.options.length ? (
                    q.options.map((o) => <Badge key={o.id}>{o.label}</Badge>)
                  ) : (
                    <span className="hint">
                      {q.type === 'textarea'
                        ? 'Jawaban paragraf'
                        : q.type === 'date'
                          ? 'Tanggal'
                          : q.type === 'number'
                            ? 'Angka'
                            : 'Jawaban singkat'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {template.category !== 'form' && (
        <section className="template-preview-section">
          <h3>
            Presentasi ·{' '}
            {template.slidePreset
              ? `${template.slidePreset.slides.length} slide`
              : `${template.widgets.length} komponen`}
          </h3>
          {template.slidePreset && (
            <div className="presentation-documents">
              {template.slidePreset.slides.map((slide) => (
                <div key={slide.id}>
                  <SlideThumbnail slide={slide} />
                  <p className="hint">{slide.name}</p>
                </div>
              ))}
            </div>
          )}
          <p className="hint">Pratinjau susunan. Grafik memakai jawaban dari survei tujuan.</p>
          <div className="template-layout-preview" aria-label="Susunan komponen presentasi">
            {template.widgets.map((w) => (
              <article
                key={w.id}
                style={{ gridColumn: `${w.x + 1} / span ${w.w}`, gridRow: `${w.y + 1} / span ${w.h}` }}
              >
                <strong>{w.title}</strong>
                <small>{widgetLabels[w.type]}</small>
              </article>
            ))}
          </div>
        </section>
      )}
      {template.category === 'survey' && (
        <p className="template-safe-note">
          Target: {template.settings.target.toLocaleString('id-ID')} responden ·{' '}
          {template.kind === 'skm' ? 'SKM dengan perhitungan IKM' : 'Analisis survei kustom'}
        </p>
      )}
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </Modal>
  );
}
export function TemplateLibrary({
  saved,
  surveys,
  initialQuery = '',
}: {
  saved: SavedTemplate[];
  surveys: Survey[];
  initialQuery?: string;
}) {
  const [personal, setPersonal] = useState(saved);
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState(initialQuery);
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<SavedTemplate | null>(null);
  const [preview, setPreview] = useState<SavedTemplate | null>(null);
  const [operation, setOperation] = useState<{ kind: 'edit' | 'duplicate'; template: SavedTemplate } | null>(
    null,
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = personal.filter((t) => !t.archivedAt);
  const archiveCount = personal.filter((t) => t.archivedAt).length;
  const all = archived ? personal.filter((t) => t.archivedAt) : [...systemTemplates, ...active];
  const filtered = all.filter(
    (t) =>
      (category === 'all' || t.category === category) &&
      `${t.name} ${t.description}`
        .toLocaleLowerCase('id-ID')
        .includes(search.trim().toLocaleLowerCase('id-ID')),
  );
  function remember(template: SavedTemplate) {
    setPersonal((current) => [template, ...current.filter((t) => t.id !== template.id)]);
  }
  function startOperation(template: SavedTemplate, kind: 'edit' | 'duplicate') {
    setName(kind === 'duplicate' ? `${template.name.slice(0, 190)} (salinan)` : template.name);
    setDescription(template.description);
    setError('');
    setOperation({ kind, template });
  }
  async function mutate(template: SavedTemplate, method: 'POST' | 'PATCH', body: unknown) {
    const response = await fetch(`/api/templates/${template.id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    remember(data);
    return data as SavedTemplate;
  }
  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!operation) return;
    setPending(true);
    setError('');
    try {
      await mutate(
        operation.template,
        operation.kind === 'edit' ? 'PATCH' : 'POST',
        operation.kind === 'edit' ? { name, description } : { action: 'duplicate', name },
      );
      setOperation(null);
      setNotice(
        operation.kind === 'edit'
          ? 'Detail template diperbarui.'
          : 'Salinan template tersimpan di workspace Anda.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan.');
    } finally {
      setPending(false);
    }
  }
  async function archive(template: SavedTemplate) {
    setPending(true);
    setError('');
    try {
      await mutate(template, 'PATCH', { archived: !template.archivedAt });
      setNotice(
        template.archivedAt ? 'Template dipulihkan.' : 'Template diarsipkan. Buka Arsip untuk memulihkannya.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal mengubah template.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pustaka untuk ide berikutnya.</h1>
          <p>Simpan form, presentasi, atau paket survei. Pakai kembali saat dibutuhkan.</p>
        </div>
        <div className="actions">
          <Badge tone="purple">{systemTemplates.length + active.length} template</Badge>
          <Button onClick={() => setCreating(true)} disabled={!surveys.length}>
            <Plus size={14} />
            Buat template
          </Button>
        </div>
      </div>
      <div className="template-library-toolbar">
        <div className="tabs-filter" aria-label="Filter jenis template">
          {(['all', 'form', 'presentation', 'survey'] as const).map((type) => (
            <button
              type="button"
              key={type}
              className={category === type ? 'active' : ''}
              aria-pressed={category === type}
              onClick={() => setCategory(type)}
            >
              {type === 'all' ? 'Semua' : templateLabels[type]}
              <span>{all.filter((t) => type === 'all' || t.category === type).length}</span>
            </button>
          ))}
        </div>
        <div className="actions">
          <div className="search-input">
            <Search size={14} />
            <input
              className="input"
              aria-label="Cari template"
              placeholder="Cari template…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" aria-pressed={archived} onClick={() => setArchived((value) => !value)}>
            <Archive size={14} />
            {archived ? 'Template aktif' : `Arsip (${archiveCount})`}
          </Button>
        </div>
      </div>
      {notice && (
        <div className="banner" role="status">
          {notice}
        </div>
      )}
      {error && !operation && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      <div className="template-library">
        {filtered.map((template) => {
          const Icon = icons[template.category];
          return (
            <section className="card template-card" key={template.id}>
              <div className="template-card-header">
                <div className="survey-icon">
                  <Icon size={20} />
                </div>
                <Badge
                  tone={
                    template.category === 'presentation'
                      ? 'purple'
                      : template.category === 'survey'
                        ? 'green'
                        : 'neutral'
                  }
                >
                  {templateLabels[template.category]}
                </Badge>
              </div>
              <h3>{template.name}</h3>
              <p>{template.description || 'Susunan tersimpan untuk survei berikutnya.'}</p>
              <div className="actions template-card-meta">
                <Badge>
                  {template.builtIn ? 'Bawaan' : template.archivedAt ? 'Diarsipkan' : 'Template Anda'}
                </Badge>
                <span className="hint">
                  {template.category !== 'presentation'
                    ? `${template.questions.length} pertanyaan`
                    : template.slidePreset
                      ? `${template.slidePreset.slides.length} slide`
                      : `${template.widgets.length} komponen`}
                  {template.category === 'survey' ? ` · ${template.widgets.length} komponen` : ''}
                </span>
              </div>
              <div className="template-card-actions">
                <Button variant="secondary" onClick={() => setPreview(template)}>
                  <Eye size={13} />
                  Pratinjau
                </Button>
                {template.archivedAt ? (
                  <Button disabled={pending} onClick={() => void archive(template)} variant="secondary">
                    <ArchiveRestore size={13} />
                    Pulihkan
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelected(template)}
                    disabled={template.category === 'presentation' && !surveys.length}
                  >
                    {template.category === 'presentation' ? 'Gunakan' : 'Buat survei'}
                    <ArrowRight size={13} />
                  </Button>
                )}
              </div>
              {!template.archivedAt && (
                <div className="template-manage-actions">
                  <Button
                    variant="ghost"
                    aria-label={`Duplikat template ${template.name}`}
                    title="Duplikat"
                    onClick={() => startOperation(template, 'duplicate')}
                  >
                    <Copy size={14} />
                  </Button>
                  {!template.builtIn && (
                    <>
                      <Button
                        variant="ghost"
                        aria-label={`Ubah template ${template.name}`}
                        title="Ubah nama dan deskripsi"
                        onClick={() => startOperation(template, 'edit')}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={pending}
                        aria-label={`Arsipkan template ${template.name}`}
                        title="Arsipkan"
                        onClick={() => void archive(template)}
                      >
                        <Archive size={14} />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      {!filtered.length && (
        <section className="card">
          <EmptyState
            icon={<Bookmark size={24} />}
            title={archived ? 'Belum ada template di arsip.' : 'Template belum ditemukan.'}
            description="Coba filter lain atau simpan susunan dari survei Anda."
          />
        </section>
      )}
      <div className="banner" style={{ marginTop: 25 }}>
        <Bookmark size={15} />
        Simpan dari editor lewat Simpan template, atau pilih survei melalui Buat template.
      </div>
      {creating && (
        <SaveTemplateDialog
          sources={surveys}
          onClose={() => setCreating(false)}
          onSaved={(template) => {
            remember(template);
            setArchived(false);
            setNotice('Template tersimpan di pustaka workspace.');
          }}
          initialCategory={category === 'all' ? 'form' : category}
        />
      )}
      {preview && <TemplatePreview template={preview} onClose={() => setPreview(null)} />}
      {selected &&
        (selected.category === 'presentation' ? (
          <ApplyPresentationDialog template={selected} surveys={surveys} onClose={() => setSelected(null)} />
        ) : (
          <CreateSurvey
            key={selected.id}
            open
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
            initialTemplate={selected.id}
            templates={active}
          />
        ))}
      {operation && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setOperation(null);
          }}
          title={operation.kind === 'edit' ? 'Ubah detail template' : 'Duplikat template'}
          description={operation.template.name}
        >
          <form onSubmit={saveDetails}>
            <div className="field">
              <label htmlFor="manage-template-name">Nama template</label>
              <input
                id="manage-template-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            {operation.kind === 'edit' && (
              <div className="field">
                <label htmlFor="manage-template-description">Deskripsi template</label>
                <textarea
                  id="manage-template-description"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
            )}
            {error && (
              <div className="banner banner-error" role="alert">
                {error}
              </div>
            )}
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setOperation(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                {operation.kind === 'edit' ? 'Simpan detail' : 'Buat salinan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
