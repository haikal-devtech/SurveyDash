'use client';
import { useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import type { SavedTemplate, Survey, TemplateCategory } from '@/lib/types';
import { templateLabels } from '@/lib/template-model';
import { Button, Modal } from './ui';

const descriptions = {
  form: 'Pertanyaan, pilihan jawaban, dan identitas form.',
  presentation: 'Posisi, ukuran, jenis grafik, kartu angka, dan catatan.',
  survey: 'Form, presentasi, dan pengaturan target dalam satu paket.',
};
export function SaveTemplateDialog({
  onClose,
  onSaved,
  survey,
  sources = [],
  initialCategory = 'form',
}: {
  onClose: () => void;
  onSaved: (template: SavedTemplate) => void;
  survey?: Survey;
  sources?: Pick<Survey, 'id' | 'title'>[];
  initialCategory?: TemplateCategory;
}) {
  const [name, setName] = useState(survey?.title ?? '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sourceId, setSourceId] = useState(survey?.id ?? sources[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          surveyId: sourceId,
          ...(survey ? { snapshot: survey } : {}),
        }),
      });
      const template = await response.json();
      if (!response.ok) throw new Error(template.error);
      onSaved(template);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Template gagal disimpan.');
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
      title="Simpan sebagai template"
      description="Buat fondasi yang dapat dipakai ulang di workspace Anda."
    >
      <form onSubmit={save}>
        {!survey && (
          <div className="field">
            <label htmlFor="template-source">Ambil dari survei</label>
            <select
              id="template-source"
              className="input"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              required
            >
              {!sources.length && <option value="">Buat survei terlebih dahulu</option>}
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <fieldset className="template-category-options">
          <legend className="label">Yang ingin disimpan</legend>
          {(Object.keys(templateLabels) as TemplateCategory[]).map((type) => (
            <label className={`template-category-option ${category === type ? 'active' : ''}`} key={type}>
              <input
                type="radio"
                name="template-category"
                value={type}
                checked={category === type}
                onChange={() => setCategory(type)}
              />
              <span>
                <strong>{templateLabels[type]}</strong>
                <small>{descriptions[type]}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="template-name">Nama template</label>
          <input
            id="template-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            placeholder="Contoh: SKM layanan tahunan"
          />
        </div>
        <div className="field">
          <label htmlFor="template-description">
            Deskripsi template <span>(opsional)</span>
          </label>
          <textarea
            id="template-description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Kapan template ini digunakan?"
          />
        </div>
        <p className="hint template-safe-note">
          {survey ? 'Susunan di editor saat ini akan disimpan. ' : ''}Jawaban responden tidak disalin. Survei
          baru dimulai sebagai draft.
        </p>
        {error && (
          <div role="alert" className="banner banner-error">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending || !sourceId}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}Simpan template
          </Button>
        </div>
      </form>
    </Modal>
  );
}
