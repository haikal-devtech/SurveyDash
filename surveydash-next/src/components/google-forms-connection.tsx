'use client';
import { useEffect, useState } from 'react';
import { Link2, Loader2, Unplug } from 'lucide-react';
import { Button, Badge } from './ui';
import type { FormImportPreview } from '@/lib/form-responses-import';

export function GoogleFormsConnection({
  onPreview,
  onInvalidate,
  disabled = false,
  failed,
}: {
  onPreview: (preview: FormImportPreview) => void;
  onInvalidate: () => void;
  disabled?: boolean;
  failed?: boolean;
}) {
  const [connection, setConnection] = useState<{
    configured: boolean;
    connected: boolean;
    canReadResponses?: boolean;
  } | null>(null);
  const [statusError, setStatusError] = useState('');
  const [error, setError] = useState(
    failed ? 'Sambungan Google belum selesai. Tinjau izin lalu coba lagi.' : '',
  );
  const [epoch, setEpoch] = useState(0);
  const [formId, setFormId] = useState('');
  const [pending, setPending] = useState(false);
  const [includeResponses, setIncludeResponses] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/integrations/google-forms', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setConnection(data);
          setStatusError('');
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setStatusError(failure instanceof Error ? failure.message : 'Sambungan gagal diperiksa.');
      });
    return () => controller.abort();
  }, [epoch]);
  async function action(kind: 'connect' | 'preview' | 'disconnect') {
    if (pending || disabled) return;
    onInvalidate();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/google-forms', {
        method: kind === 'disconnect' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          kind === 'disconnect'
            ? undefined
            : JSON.stringify({ action: kind, ...(kind === 'preview' ? { formId, includeResponses } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind === 'connect') {
        const url = new URL(data.url);
        if (url.origin !== 'https://accounts.google.com') throw new Error('Alamat sambungan tidak valid.');
        window.location.assign(url.toString());
      } else if (kind === 'preview') {
        onPreview(data);
      } else {
        setConnection((previous) => (previous ? { ...previous, connected: false } : previous));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Google belum dapat dihubungi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="card membership-card">
      <Badge tone={connection?.connected ? 'green' : 'neutral'}>
        {connection?.connected ? 'Google tersambung' : 'Impor Google Forms'}
      </Badge>
      <h2 style={{ marginTop: 16 }}>Pindahkan Google Form Anda.</h2>
      <p>Bawa pertanyaan dan jawaban lama. Form sumber tetap tersimpan di Google.</p>
      {statusError ? (
        <div role="alert">
          <p>{statusError}</p>
          <Button variant="secondary" onClick={() => setEpoch((value) => value + 1)}>
            Coba lagi
          </Button>
        </div>
      ) : !connection ? (
        <p role="status">Memeriksa sambungan…</p>
      ) : !connection.configured ? (
        <p className="hint">
          Sambungan Google belum diaktifkan pengelola. Impor file JSON tersedia di bawah.
        </p>
      ) : !connection.connected ? (
        <Button disabled={pending || disabled} onClick={() => void action('connect')}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}Sambungkan Google
        </Button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action('preview');
          }}
        >
          <div className="field">
            <label htmlFor="google-form-id">Link editor atau ID Google Form</label>
            <input
              id="google-form-id"
              className="input"
              disabled={pending || disabled}
              required
              minLength={10}
              maxLength={1000}
              value={formId}
              onChange={(event) => {
                setFormId(event.target.value);
                onInvalidate();
              }}
              placeholder="https://docs.google.com/forms/d/…/edit"
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeResponses}
              disabled={pending || disabled}
              onChange={(event) => {
                setIncludeResponses(event.target.checked);
                onInvalidate();
              }}
            />
            Sertakan jawaban responden
          </label>
          {includeResponses && !connection.canReadResponses && (
            <p className="hint">Klik “Perbarui izin” untuk mengizinkan pembacaan jawaban.</p>
          )}
          <div className="actions">
            <Button
              type="submit"
              disabled={pending || disabled || (includeResponses && !connection.canReadResponses)}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}Tinjau data
            </Button>
            <Button variant="secondary" disabled={pending || disabled} onClick={() => void action('connect')}>
              Perbarui izin
            </Button>
            <Button variant="ghost" disabled={pending || disabled} onClick={() => void action('disconnect')}>
              <Unplug size={16} />
              Putuskan sambungan
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
