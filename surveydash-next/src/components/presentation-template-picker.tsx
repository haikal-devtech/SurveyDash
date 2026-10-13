'use client';
import { useEffect, useState } from 'react';
import { Loader2, LayoutTemplate, ArrowRight } from 'lucide-react';
import type { SavedTemplate, Survey } from '@/lib/types';
import { ApplyPresentationDialog } from './apply-presentation-dialog';
import { Button, Modal } from './ui';

export function PresentationTemplatePicker({
  survey,
  onClose,
  onApply,
}: {
  survey: Survey;
  onClose: () => void;
  onApply: (widgets: Survey['widgets']) => void;
}) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selected, setSelected] = useState<SavedTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/templates', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTemplates(data.templates.filter((t: SavedTemplate) => t.category !== 'form' && !t.slidePreset));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message ?? 'Gagal memuat template.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  if (selected)
    return (
      <ApplyPresentationDialog template={selected} surveys={[survey]} onClose={onClose} onApplied={onApply} />
    );
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Pilih template presentasi"
      description="Pakai susunan bawaan atau template yang sudah Anda simpan."
      wide
    >
      {loading && (
        <p className="template-safe-note" role="status">
          <Loader2 size={14} className="animate-spin" /> Memuat template…
        </p>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      <div className="presentation-template-options">
        {templates.map((template) => (
          <button
            type="button"
            className="template-option"
            key={template.id}
            onClick={() => setSelected(template)}
          >
            <LayoutTemplate size={20} />
            <div>
              <strong>{template.name}</strong>
              <p>
                {template.widgets.length} komponen · {template.builtIn ? 'Bawaan' : 'Template Anda'}
              </p>
            </div>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
      {!loading && !error && !templates.length && (
        <p className="banner">
          Belum ada template presentasi. Simpan susunan yang sedang Anda buat sebagai template.
        </p>
      )}
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
      </div>
    </Modal>
  );
}
