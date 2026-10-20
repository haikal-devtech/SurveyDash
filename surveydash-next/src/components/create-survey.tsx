'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers3, ClipboardList, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { templateDefinitions } from '@/lib/templates';
import type { SavedTemplate } from '@/lib/types';
import { Button, Modal } from './ui';
import { TOUR_CREATED } from '@/lib/guided-tour';
export type { SavedTemplate } from '@/lib/types';
export function CreateSurvey({
  open,
  onOpenChange,
  templates = [],
  initialTemplate = 'skm',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates?: SavedTemplate[];
  initialTemplate?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState(initialTemplate);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const resp = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, templateId: selected }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent(TOUR_CREATED, { detail: { id: data.id } }));
      router.push(`/studio/${data.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal membuat survei.');
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Buat survei"
      description="Isi nama dan pilih template. Pertanyaan bisa diubah setelah survei dibuat."
    >
      <form onSubmit={create}>
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="survey-title">Nama survei</label>
          <input
            id="survey-title"
            data-tour="survey-name"
            className="input"
            placeholder="Contoh: SKM Kecamatan Serpong 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={200}
            required
            autoFocus
          />
        </div>
        <div data-tour-slot="name" />
        <p className="label" style={{ margin: '19px 0 10px' }}>
          Pilih template
        </p>
        <div data-tour-slot="template" />
        <div className="template-options">
          {[
            ...templateDefinitions,
            ...templates
              .filter((t) => t.category !== 'presentation' && !t.archivedAt)
              .map((t) => ({
                ...t,
                description: `${t.questions.length} pertanyaan${t.category === 'survey' ? ` + ${t.widgets.length} komponen presentasi` : ''} dari workspace Anda.`,
              })),
          ].map((t) => (
            <button
              type="button"
              data-tour={t.id === 'skm' ? 'template-skm' : 'survey-template'}
              data-tour-action="survey-template"
              key={t.id}
              className={`template-option ${selected === t.id ? 'active' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              {t.id === 'blank' ? (
                <Plus size={19} />
              ) : t.id === 'skm' ? (
                <ClipboardList size={19} />
              ) : (
                <Layers3 size={19} />
              )}
              <div>
                <strong>{t.name}</strong>
                <p>{t.description}</p>
              </div>
            </button>
          ))}
        </div>
        {error && (
          <div role="alert" className="banner banner-error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
        <div data-tour-slot="submit" />
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button data-tour="survey-create-submit" type="submit" disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}Buat survei
            <ArrowRight size={14} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
