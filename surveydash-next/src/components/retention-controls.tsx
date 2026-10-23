'use client';
import { useEffect, useState } from 'react';
import { workspaceFetch } from '@/lib/workspace-request';
import { Button, Modal } from './ui';
interface Retention {
  days: number;
  automaticDeletion: boolean;
  trash: { id: string; title: string; deletedAt: string; eligible: boolean; responses: number }[];
}
export function RetentionControls() {
  const [data, setData] = useState<Retention | null>(null),
    [open, setOpen] = useState(false),
    [days, setDays] = useState('90'),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const [selected, setSelected] = useState<Retention['trash'][number] | null>(null),
    [title, setTitle] = useState(''),
    [reason, setReason] = useState(''),
    [backup, setBackup] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    workspaceFetch('/api/workspace/retention', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) {
          setData(result);
          setDays(String(result.days));
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Gagal memuat retensi.');
      });
    return () => controller.abort();
  }, [open]);
  async function save(body: unknown) {
    setPending(true);
    setError('');
    try {
      const response = await workspaceFetch('/api/workspace/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setSelected(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal menyimpan.');
    } finally {
      setPending(false);
    }
  }
  return (
    <details
      className="card"
      style={{ padding: 24, marginTop: 24 }}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Retensi dan penghapusan survei</summary>
      <p>
        Penghapusan otomatis tidak aktif. Pemilik dapat menghapus permanen survei dalam sampah setelah masa
        retensi. Cadangan dan aset yang digunakan dokumen lain dikelola terpisah.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save({ action: 'policy', days: Number(days) });
        }}
      >
        <label className="field">
          Masa simpan minimum di sampah (hari)
          <input
            type="number"
            min={30}
            max={3650}
            required
            disabled={!data || pending}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={!data || pending}>
          Simpan kebijakan
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {data?.trash.map((item) => (
        <article
          key={item.id}
          style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}
        >
          <strong>{item.title}</strong>
          <p>
            {item.responses} respons · Masuk sampah {new Date(item.deletedAt).toLocaleDateString('id-ID')} ·{' '}
            {item.eligible ? 'Masa retensi terlewati' : 'Masih dalam retensi'}
          </p>
          <Button
            variant="secondary"
            disabled={!item.eligible || pending}
            onClick={() => {
              setSelected(item);
              setTitle('');
              setReason('');
              setBackup(false);
            }}
          >
            Tinjau penghapusan permanen
          </Button>
        </article>
      ))}
      <Modal
        open={!!selected}
        onOpenChange={(visible) => {
          if (!visible && !pending) setSelected(null);
        }}
        title="Hapus survei secara permanen"
      >
        <p>
          {selected?.title}: {selected?.responses} respons, riwayat, versi dataset final, penugasan dan
          presentasi survei ini akan dihapus. Tindakan ini tidak dapat dibatalkan melalui aplikasi.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (selected)
              void save({
                action: 'purge',
                surveyId: selected.id,
                title,
                reason,
                backupAcknowledged: backup,
              });
          }}
        >
          <label className="field">
            Ketik nama survei
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            Alasan penghapusan
            <textarea
              required
              minLength={10}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              required
              checked={backup}
              onChange={(event) => setBackup(event.target.checked)}
            />{' '}
            Saya sudah meninjau kewenangan dan kebutuhan cadangan sebelum menghapus.
          </label>
          {error && <p role="alert">{error}</p>}
          <div style={{ marginTop: 14 }}>
            <Button type="submit" disabled={pending || !backup || title !== selected?.title}>
              Hapus permanen
            </Button>
          </div>
        </form>
      </Modal>
    </details>
  );
}
