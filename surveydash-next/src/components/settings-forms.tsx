'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
export function SettingsForm({
  type,
  initialName,
  initialDescription = '',
  email,
}: {
  type: 'account' | 'workspace';
  initialName: string;
  initialDescription?: string;
  email?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSaved(false);
    try {
      if (type === 'account') {
        const result = await authClient.updateUser({ name });
        if (result.error) throw new Error(result.error.message ?? 'Profil gagal disimpan.');
      } else {
        const response = await fetch('/api/workspace', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, locale: 'id-ID' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      }
      setSaved(true);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Pengaturan gagal disimpan.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="card account-form" onSubmit={save}>
      <div className="field">
        <label htmlFor="profile-name">{type === 'account' ? 'Nama tampilan' : 'Nama workspace'}</label>
        <input
          id="profile-name"
          className="input"
          required
          minLength={3}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {email && (
        <div className="field">
          <label htmlFor="profile-email">Alamat email</label>
          <input id="profile-email" className="input" value={email} readOnly />
          <p className="hint">Email digunakan untuk masuk ke akun ini.</p>
        </div>
      )}
      {type === 'workspace' && (
        <>
          <div className="field">
            <label htmlFor="workspace-description">Deskripsi workspace</label>
            <textarea
              id="workspace-description"
              className="input"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <p className="template-safe-note">
            Workspace ini dikelola oleh akun Anda. Kolaborasi dan undangan anggota belum diaktifkan.
          </p>
        </>
      )}
      {saved && (
        <p className="banner" role="status">
          Pengaturan tersimpan.
        </p>
      )}
      {error && (
        <p role="alert" className="banner banner-error">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
