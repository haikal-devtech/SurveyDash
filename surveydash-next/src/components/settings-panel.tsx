'use client';
import { Bookmark, Copy, Save, Eye, ShieldCheck } from 'lucide-react';
import type { Survey } from '@/lib/types';
import { Button } from './ui';
export function SettingsPanel({
  survey,
  onChange,
  onSave,
  onTemplate,
  onCopy,
  pending,
}: {
  survey: Survey;
  onChange: (s: Survey) => void;
  onSave: (s: Survey) => Promise<boolean>;
  onTemplate: () => void;
  onCopy: () => void;
  pending: boolean;
}) {
  return (
    <>
      <div className="panel-intro">
        <div>
          <h2>Kendalikan survei Anda.</h2>
          <p>Status pengumpulan jawaban dan visibilitas diatur secara terpisah.</p>
        </div>
        <Button variant="secondary" onClick={onTemplate}>
          <Bookmark size={13} />
          Simpan sebagai template
        </Button>
      </div>
      <div className="settings-grid">
        <section className="card settings-card">
          <h3>Detail survei</h3>
          <div className="field">
            <label htmlFor="settings-title">Nama survei</label>
            <input
              id="settings-title"
              className="input"
              value={survey.title}
              onChange={(e) => onChange({ ...survey, title: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="field">
            <label htmlFor="institution">Instansi / organisasi</label>
            <input
              id="institution"
              className="input"
              value={survey.institution}
              placeholder="Nama instansi"
              onChange={(e) => onChange({ ...survey, institution: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="field">
            <label htmlFor="survey-description">Deskripsi form</label>
            <textarea
              id="survey-description"
              className="input"
              value={survey.description}
              onChange={(e) => onChange({ ...survey, description: e.target.value })}
              maxLength={3000}
            />
          </div>
          <div className="field">
            <label htmlFor="target">Target responden</label>
            <input
              id="target"
              type="number"
              min={1}
              max={10000000}
              className="input"
              value={survey.target}
              onChange={(e) => onChange({ ...survey, target: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="survey-kind">Jenis analisis</label>
            <select
              id="survey-kind"
              className="input"
              value={survey.kind}
              onChange={(e) => onChange({ ...survey, kind: e.target.value as Survey['kind'] })}
            >
              <option value="skm">SKM — 9 unsur, nilai IKM</option>
              <option value="custom">Survei kustom — distribusi jawaban</option>
            </select>
          </div>
        </section>
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="card settings-card">
            <h3>Pengumpulan jawaban</h3>
            <p>Menutup form tidak menghapus jawaban yang sudah masuk.</p>
            {[
              ['draft', 'Draft', 'Form belum dapat diakses responden.'],
              ['open', 'Buka form', 'Terima jawaban baru melalui link form.'],
              ['closed', 'Tutup form', 'Hentikan pengiriman jawaban baru.'],
            ].map(([value, label, description]) => (
              <label className="status-option" key={value}>
                <input
                  type="radio"
                  name="status"
                  checked={survey.status === value}
                  onChange={() => onChange({ ...survey, status: value as Survey['status'] })}
                />
                <strong>{label}</strong>
                <p>{description}</p>
              </label>
            ))}
          </section>
          <section className="card settings-card">
            <h3>
              <Eye size={15} style={{ display: 'inline', marginRight: 7 }} />
              Visibilitas form
            </h3>
            <p>
              Pilih bagaimana responden menemukan survei ini. Data jawaban tetap hanya dapat dilihat oleh
              pemilik workspace.
            </p>
            <select
              className="input"
              style={{ marginTop: 16 }}
              aria-label="Visibilitas form"
              value={survey.visibility}
              onChange={(e) => onChange({ ...survey, visibility: e.target.value as Survey['visibility'] })}
            >
              <option value="public">Publik — tampil di portal responden</option>
              <option value="link">Link saja — tersembunyi dari portal</option>
              <option value="private">Privat — hanya preview admin</option>
            </select>
            <div className="actions" style={{ marginTop: 16 }}>
              <Button
                variant="secondary"
                onClick={onCopy}
                disabled={survey.status === 'draft' || survey.visibility === 'private'}
              >
                <Copy size={12} />
                Salin link
              </Button>
            </div>
          </section>
        </div>
      </div>
      <div className="banner" style={{ marginTop: 20 }}>
        <ShieldCheck size={14} />
        Perubahan pengaturan berlaku setelah disimpan. Setiap workspace mempunyai data dan template sendiri.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button disabled={pending} onClick={() => void onSave(survey)}>
          <Save size={14} />
          Simpan pengaturan
        </Button>
      </div>
    </>
  );
}
