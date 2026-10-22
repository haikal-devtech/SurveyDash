'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { provinces } from '@/lib/provinces';
import type { ProvinceTarget, SurveyorTeamGroup } from '@/lib/surveyor-types';
import { Button, Modal } from './ui';

export function ProvinceTargetDialog({
  surveys,
  initialSurveyId,
  initialProvinceId,
  onClose,
  onSaved,
}: Readonly<{
  surveys: SurveyorTeamGroup[];
  initialSurveyId?: string;
  initialProvinceId?: string;
  onClose: () => void;
  onSaved: (surveyId: string, targets: ProvinceTarget[]) => void;
}>) {
  const [surveyId, setSurveyId] = useState(initialSurveyId ?? surveys[0]?.surveyId ?? '');
  const [provinceId, setProvinceId] = useState(initialProvinceId ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const current = surveys
    .find((survey) => survey.surveyId === surveyId)
    ?.provinceTargets.find((target) => target.provinceId === provinceId)?.target;
  const key = `${surveyId}:${provinceId}`;
  const value = drafts[key] ?? (current === undefined ? '' : String(current));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(surveyId)}/province-targets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinceId, target: value.trim() ? Number(value) : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Target belum berhasil disimpan.');
      onSaved(surveyId, data.targets);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Target responden"
      description="Atur per provinsi untuk survei ini. Jawaban tetap diterima setelah target terlewati."
    >
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="target-survey">Survei</label>
          <select
            id="target-survey"
            className="input"
            value={surveyId}
            disabled={pending}
            onChange={(event) => setSurveyId(event.target.value)}
          >
            {surveys.map((survey) => (
              <option key={survey.surveyId} value={survey.surveyId}>
                {survey.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="target-province">Provinsi</label>
          <select
            id="target-province"
            className="input"
            value={provinceId}
            disabled={pending}
            required
            onChange={(event) => setProvinceId(event.target.value)}
          >
            <option value="" disabled>
              Pilih provinsi
            </option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="province-target">Jumlah target</label>
          <input
            id="province-target"
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000000}
            step={1}
            value={value}
            placeholder="Contoh: 500"
            disabled={pending}
            aria-describedby="province-target-hint"
            onChange={(event) => setDrafts((entries) => ({ ...entries, [key]: event.target.value }))}
          />
          <p className="hint" id="province-target-hint">
            Kosongkan untuk menghapus target. Target provinsi terpisah dari target total survei.
          </p>
        </div>
        {error && (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={pending || !surveyId || !provinceId}>
            {pending && <Loader2 size={16} className="animate-spin" />}Simpan target
          </Button>
        </div>
      </form>
    </Modal>
  );
}
