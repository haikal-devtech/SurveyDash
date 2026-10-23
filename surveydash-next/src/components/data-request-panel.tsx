'use client';
import { useEffect, useState } from 'react';
import type { DataRequestItem } from '@/lib/data-request-model';
import { Button, Modal } from './ui';
const labels: Record<string, string> = {
  access: 'Salinan data',
  correction: 'Koreksi data',
  deletion: 'Penghapusan data',
  withdrawal: 'Penarikan persetujuan',
  pending: 'Menunggu',
  reviewing: 'Ditinjau',
  completed: 'Selesai',
  declined: 'Tidak dapat dipenuhi',
};
export function DataRequestPanel() {
  const [items, setItems] = useState<DataRequestItem[]>([]),
    [kind, setKind] = useState('access'),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [epoch, setEpoch] = useState(0),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/account/data-request', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Gagal memuat.');
      });
    return () => controller.abort();
  }, [open, epoch]);
  return (
    <details style={{ marginTop: 24 }} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Permintaan terkait data pribadi</summary>
      <p>
        Operator akan memeriksa identitas dan kewenangan Anda. Jangan tulis kata sandi, secret authenticator,
        atau nomor rekening lengkap.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError('');
          try {
            const response = await fetch('/api/account/data-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind, note }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setNote('');
            setEpoch((value) => value + 1);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Permintaan gagal.');
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="field">
          Jenis permintaan
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            {['access', 'correction', 'deletion', 'withdrawal'].map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Keterangan
          <textarea
            required
            minLength={10}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Ajukan permintaan'}
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {items.map((item) => (
        <article
          key={item.id}
          style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}
        >
          <strong>
            {labels[item.kind]} · {labels[item.status]}
          </strong>
          <p>{item.note}</p>
          {item.operatorNote && <p>Catatan operator: {item.operatorNote}</p>}
        </article>
      ))}
    </details>
  );
}
export function DataRequestAdmin({ initial }: { initial: DataRequestItem[] }) {
  const [items, setItems] = useState(initial),
    [selected, setSelected] = useState<DataRequestItem | null>(null),
    [status, setStatus] = useState('reviewing'),
    [note, setNote] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="card" style={{ padding: 24, marginTop: 20 }}>
      <h2>Permintaan terkait data</h2>
      <p className="hint">
        Selesaikan verifikasi pemohon dan tindakan yang diperlukan sebelum menandai Selesai. Mengubah status
        tidak menghapus akun atau jawaban secara otomatis.
      </p>
      {!items.length && <p>Belum ada permintaan.</p>}
      {items.map((item) => (
        <article key={item.id} style={{ borderTop: '1px solid var(--border)', paddingBlock: 12 }}>
          <strong>
            {item.email || item.userId} · {labels[item.kind]} · {labels[item.status]}
          </strong>
          <p>{item.note}</p>
          {item.operatorNote && <p>{item.operatorNote}</p>}
          <Button
            variant="secondary"
            onClick={() => {
              setSelected(item);
              setNote(item.operatorNote);
              setError('');
              setStatus(item.status === 'pending' ? 'reviewing' : item.status);
            }}
          >
            Tangani
          </Button>
        </article>
      ))}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null);
        }}
        title="Tindak lanjut permintaan"
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!selected) return;
            setPending(true);
            setError('');
            try {
              const response = await fetch('/api/admin/data-requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selected.id, status, note }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              const updated = await fetch('/api/admin/data-requests');
              if (!updated.ok) throw new Error('Status tersimpan, tetapi daftar belum dapat diperbarui.');
              setItems(await updated.json());
              setSelected(null);
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Gagal menyimpan.');
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {['reviewing', 'completed', 'declined'].map((value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Catatan untuk pemohon
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={pending}>
            Simpan tindak lanjut
          </Button>
        </form>
      </Modal>
    </section>
  );
}
