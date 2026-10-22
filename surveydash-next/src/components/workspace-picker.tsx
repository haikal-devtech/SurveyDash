'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkspaceChoice } from '@/lib/workspace-types';
export function WorkspacePicker({
  choices,
  currentOwnerId,
  currentName,
}: Readonly<{ choices: WorkspaceChoice[]; currentOwnerId: string; currentName: string }>) {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  async function change(ownerId: string) {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/workspace/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Workspace belum dapat dibuka.');
      router.push('/studio');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
    } finally {
      setPending(false);
    }
  }
  if (choices.length < 2 && choices.some((choice) => choice.ownerId === currentOwnerId)) return null;
  return (
    <div className="workspace-picker">
      <label>
        Ganti workspace
        <select
          className="input"
          value={currentOwnerId}
          disabled={pending}
          onChange={(event) => void change(event.target.value)}
        >
          {!choices.some((choice) => choice.ownerId === currentOwnerId) && (
            <option value={currentOwnerId}>{currentName}</option>
          )}
          {choices.map((choice) => (
            <option key={choice.ownerId} value={choice.ownerId}>
              {choice.name} · {choice.own ? 'Saya' : choice.ownerName}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
