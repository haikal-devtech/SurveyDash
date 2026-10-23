'use client';
import { workspaceFetch } from '@/lib/workspace-request';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import type { SavedTemplate, Survey } from '@/lib/types';
import {
  compatibleTargets,
  mapPresentation,
  presentationBindings,
  suggestBindings,
} from '@/lib/template-model';
import { Button, Modal } from './ui';

export function ApplyPresentationDialog({
  template,
  surveys,
  onClose,
  onApplied,
}: {
  template: SavedTemplate;
  surveys: Survey[];
  onClose: () => void;
  onApplied?: (widgets: Survey['widgets']) => void;
}) {
  const router = useRouter();
  const [surveyId, setSurveyId] = useState(surveys[0]?.id ?? '');
  const target = surveys.find((s) => s.id === surveyId);
  const [mapping, setMapping] = useState(() => (target ? suggestBindings(template, target) : {}));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const bindings = presentationBindings(template);
  const complete = !!target && bindings.every((q) => !!mapping[q.id]);
  function selectSurvey(id: string) {
    setSurveyId(id);
    setError('');
    const selected = surveys.find((s) => s.id === id);
    setMapping(selected ? suggestBindings(template, selected) : {});
  }
  async function apply(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setPending(true);
    setError('');
    try {
      const widgets = template.slidePreset ? [] : mapPresentation(template, target, mapping);
      if (onApplied) {
        onApplied(widgets);
        onClose();
        return;
      }
      const response = await workspaceFetch(`/api/templates/${template.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: target.id, version: target.version, mapping }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onClose();
      router.push(
        template.slidePreset ? `/studio/${target.id}/presentations/${data.id}` : `/studio/${target.id}`,
      );
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Template gagal dipakai.');
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Gunakan template presentasi"
      description={template.name}
      wide
    >
      <form onSubmit={apply}>
        {surveys.length > 1 && (
          <div className="field">
            <label htmlFor="presentation-target">Survei tujuan</label>
            <select
              id="presentation-target"
              className="input"
              value={surveyId}
              onChange={(e) => selectSurvey(e.target.value)}
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
        {!target ? (
          <p className="banner">Buat survei sebelum memasang template presentasi.</p>
        ) : (
          <>
            <p className="template-safe-note">
              {template.slidePreset
                ? `${template.slidePreset.slides.length} slide`
                : `${template.widgets.length} komponen`}{' '}
              untuk <strong>{target.title}</strong>. Pilih pertanyaan yang menjadi sumber data setiap grafik.
            </p>
            <div className="template-bindings">
              {bindings.map((source) => (
                <div className="field" key={source.id}>
                  <label htmlFor={`binding-${source.id}`}>{source.label}</label>
                  <select
                    id={`binding-${source.id}`}
                    className="input"
                    value={mapping[source.id] ?? ''}
                    onChange={(e) => setMapping((current) => ({ ...current, [source.id]: e.target.value }))}
                    required
                  >
                    <option value="">Pilih pertanyaan tujuan</option>
                    {compatibleTargets(template, source, target).map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  {!compatibleTargets(template, source, target).length && (
                    <p className="hint">
                      Belum ada pertanyaan dengan jenis data yang sesuai. Tambahkan pertanyaan pilihan atau
                      pilih survei lain.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="banner">
              {template.slidePreset
                ? 'Dokumen presentasi baru akan dibuat. '
                : 'Susunan presentasi saat ini akan diganti. '}
              {onApplied
                ? 'Anda dapat meninjau hasilnya sebelum menyimpan perubahan.'
                : 'Form dan jawaban yang sudah masuk tetap tersedia.'}
            </div>
          </>
        )}
        {error && (
          <div role="alert" className="banner banner-error">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending || !complete}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <LayoutTemplate size={14} />}
            {onApplied ? 'Terapkan ke editor' : 'Gunakan template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
