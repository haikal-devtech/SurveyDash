'use client';
import { useState } from 'react';
import { ClipboardList, Plus, ArrowRight, Bookmark } from 'lucide-react';
import { templateDefinitions } from '@/lib/templates';
import { CreateSurvey, type SavedTemplate } from './create-survey';
import { Badge, Button } from './ui';
export function TemplateLibrary({ saved }: { saved: SavedTemplate[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Fondasi untuk ide berikutnya.</h1>
          <p>Pakai ulang struktur pertanyaan, lalu sesuaikan dengan kebutuhan survei.</p>
        </div>
        <Badge tone="purple">{3 + saved.length} template</Badge>
      </div>
      <div className="template-library">
        {[
          ...templateDefinitions,
          ...saved.map((t) => ({
            ...t,
            description: `Template tersimpan · ${t.questions.length} pertanyaan.`,
          })),
        ].map((t) => (
          <section className="card template-card" key={t.id}>
            <div className="survey-icon">
              {t.id === 'blank' ? <Plus size={20} /> : <ClipboardList size={20} />}
            </div>
            <h3>{t.name}</h3>
            <p>{t.description}</p>
            <div style={{ marginBottom: 20 }}>
              <Badge>{t.kind === 'skm' ? 'Perhitungan IKM' : 'Survei kustom'}</Badge>
            </div>
            <Button variant="secondary" onClick={() => setSelected(t.id)}>
              Gunakan template
              <ArrowRight size={13} />
            </Button>
          </section>
        ))}
      </div>
      <div className="banner" style={{ marginTop: 25 }}>
        <Bookmark size={15} />
        Simpan struktur pertanyaan dari Pengaturan survei untuk membuat template pribadi.
      </div>
      {selected && (
        <CreateSurvey
          key={selected}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          initialTemplate={selected}
          templates={saved}
        />
      )}
    </>
  );
}
