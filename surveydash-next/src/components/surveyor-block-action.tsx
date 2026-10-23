'use client';
import { useState } from 'react';
import { Button, Modal } from './ui';
import { workspaceFetch } from '@/lib/workspace-request';
import { useWorkspacePermissions } from './workspace-permissions';
export function SurveyorBlockAction({
  surveyorId,
  blocked,
  global = false,
  onSaved,
}: {
  surveyorId: string;
  blocked: boolean;
  global?: boolean;
  onSaved: () => void;
}) {
  const { canField } = useWorkspacePermissions();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (!canField) return null;
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {blocked ? 'Tinjau pembatasan' : 'Batasi akses'}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={blocked ? 'Pulihkan akses Surveyor' : 'Batasi akses Surveyor'}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError('');
            try {
              const response = await workspaceFetch(
                global ? '/api/admin/surveyor-blocks' : '/api/workspace/blocks',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ surveyorId, active: !blocked, reason }),
                },
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setOpen(false);
              setReason('');
              onSaved();
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Gagal menyimpan.');
            } finally {
              setPending(false);
            }
          }}
        >
          <p>
            {global ? 'Berlaku di seluruh platform.' : 'Berlaku untuk seluruh survei workspace ini.'}{' '}
            {blocked
              ? 'Tugas perlu diaktifkan kembali satu per satu.'
              : 'Seluruh tugas dinonaktifkan dan undangan baru ditolak. Jawaban lama tetap disimpan untuk ditinjau.'}
          </p>
          <label className="field">
            Alasan
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Menyimpan…' : blocked ? 'Pulihkan akses' : 'Batasi akses'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
