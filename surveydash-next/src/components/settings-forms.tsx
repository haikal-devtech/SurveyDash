'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Upload } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
import { UserAvatar } from './user-avatar';
export function SettingsForm({
  type,
  initialName,
  initialDescription = '',
  email,
  initialImage,
}: {
  type: 'account' | 'workspace';
  initialName: string;
  initialDescription?: string;
  email?: string;
  initialImage?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [image, setImage] = useState(initialImage);
  const [uploading, setUploading] = useState(false);
  async function uploadAvatar(file: File) {
    setUploading(true);
    setError('');
    try {
      if (file.size > 2500000) throw new Error('Foto profil maksimal 2,5 MB.');
      const body = new FormData();
      body.set('image', file);
      const response = await fetch('/api/account/avatar', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setImage(data.image);
      setSaved(true);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Foto profil gagal disimpan.');
    } finally {
      setUploading(false);
    }
  }
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
      {type === 'account' && (
        <div className="profile-avatar-field">
          <UserAvatar name={name} image={image} />
          <label className="profile-avatar-upload">
            <span>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}Foto profil
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading || pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
                event.target.value = '';
              }}
            />
            <small>PNG, JPG, atau WebP · Maksimal 2,5 MB</small>
          </label>
        </div>
      )}
      <div className="field">
        <label htmlFor="profile-name">{type === 'account' ? 'Nama tampilan' : 'Nama workspace'}</label>
        <input
          id="profile-name"
          className="input"
          required
          minLength={type === 'account' ? 2 : 3}
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
            Nama dan deskripsi ini terlihat oleh Pengelola yang bergabung dalam workspace.
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
        <Button type="submit" disabled={pending || uploading}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
