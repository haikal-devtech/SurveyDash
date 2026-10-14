'use client';
import { useEffect, useState } from 'react';
import { Link2, Loader2, Unplug } from 'lucide-react';
import { Button, Badge } from './ui';

export function GoogleFormsConnection({
  onSource,
  failed,
}: {
  onSource: (source: unknown) => void;
  failed?: boolean;
}) {
  const [connection, setConnection] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [statusError, setStatusError] = useState('');
  const [error, setError] = useState(
    failed ? 'Sambungan Google belum selesai. Tinjau izin lalu coba lagi.' : '',
  );
  const [epoch, setEpoch] = useState(0);
  const [formId, setFormId] = useState('');
  const [pending, setPending] = useState(false);
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
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/google-forms', {
        method: kind === 'disconnect' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          kind === 'disconnect'
            ? undefined
            : JSON.stringify({ action: kind, ...(kind === 'preview' ? { formId } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind === 'connect') {
        const url = new URL(data.url);
        if (url.origin !== 'https://accounts.google.com') throw new Error('Alamat sambungan tidak valid.');
        window.location.assign(url.toString());
      } else if (kind === 'preview') {
        onSource(data.source);
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
      <h2 style={{ marginTop: 16 }}>Ambil form dari akun Google.</h2>
      <p>
        Berikan izin membaca pertanyaan, lalu pilih form melalui link editor atau ID-nya. Form sumber dan
        jawaban lama tetap tersimpan di Google.
      </p>
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
          Sambungan Google belum diaktifkan pengelola. Anda dapat memakai impor file JSON di bawah.
        </p>
      ) : !connection.connected ? (
        <Button disabled={pending} onClick={() => void action('connect')}>
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
              required
              minLength={10}
              maxLength={1000}
              value={formId}
              onChange={(event) => setFormId(event.target.value)}
              placeholder="https://docs.google.com/forms/d/…/edit"
            />
          </div>
          <div className="actions">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 size={16} className="animate-spin" />}Tinjau pertanyaan
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => void action('connect')}>
              Perbarui izin
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => void action('disconnect')}>
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
