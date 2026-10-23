'use client';
import { workspaceFetch } from '@/lib/workspace-request';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { provinces } from '@/lib/provinces';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import { Button, Modal } from './ui';

export function AssignmentProvinceDialog({
  surveyId,
  assignment,
  onClose,
  onSaved,
}: Readonly<{
  surveyId: string;
  assignment: ManagedSurveyorAssignment;
  onClose: () => void;
  onSaved: (assignments: ManagedSurveyorAssignment[]) => void;
}>) {
  const [provinceId, setProvinceId] = useState(assignment.provinceId ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await workspaceFetch(`/api/surveys/${encodeURIComponent(surveyId)}/surveyors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, provinceId: provinceId || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Wilayah belum berhasil disimpan.');
      onSaved(data.assignments);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Koneksi gagal. Coba lagi.');
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
      title="Wilayah tugas"
      description={`@${assignment.username} · Berlaku untuk survei ini.`}
    >
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="assignment-province">Provinsi</label>
          <select
            id="assignment-province"
            className="input"
            value={provinceId}
            onChange={(event) => setProvinceId(event.target.value)}
            disabled={pending}
          >
            <option value="">Belum diatur</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
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
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}Simpan wilayah
          </Button>
        </div>
      </form>
    </Modal>
  );
}
