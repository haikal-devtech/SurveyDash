'use client';
import { workspaceFetch } from '@/lib/workspace-request';
import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import type { ShareStatus } from '@/lib/share-repository';
import { Button, Modal, Badge } from './ui';
export function ShareDialog({ id, version, onClose }: { id: string; version: number; onClose: () => void }) {
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    workspaceFetch(`/api/presentations/${id}/share`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        setStatus(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  async function mutate(revoke = false) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await workspaceFetch(`/api/presentations/${id}/share`, {
        method: revoke ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: revoke ? undefined : JSON.stringify({ version, acknowledge: ack }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setStatus({ ...data, currentVersion: version });
      setConfirmRevoke(false);
      setAck(false);
      setNotice(
        revoke
          ? 'Link dicabut. Publikasi berikutnya akan mendapat link baru.'
          : 'Versi yang Anda tinjau sekarang dapat dibuka melalui link.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal mengatur link berbagi.');
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    if (!status?.url) return;
    try {
      await navigator.clipboard.writeText(status.url);
      setNotice('Link presentasi disalin.');
    } catch {
      setError('Tidak dapat menyalin. Pilih alamat link dan salin secara manual.');
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Bagikan presentasi"
      description="Pemegang link dapat melihat versi slide yang Anda bagikan."
    >
      <Badge tone={status?.active ? 'green' : 'neutral'}>
        {loading ? 'Memuat…' : status?.active ? 'Link aktif' : 'Belum dibagikan'}
      </Badge>
      <p className="template-safe-note" style={{ marginTop: 18 }}>
        Slide, angka agregat, teks manual, dan gambar dapat dilihat tanpa akun Studio. Form, tabel jawaban,
        dan akses editor tetap dikelola di workspace.
      </p>
      {status?.active && (
        <>
          <label className="field" style={{ marginTop: 18 }}>
            Link presentasi
            <input readOnly value={status.url} onFocus={(e) => e.target.select()} />
          </label>
          <div className="actions">
            <Button variant="secondary" onClick={() => void copy()}>
              <Copy size={13} />
              Salin link
            </Button>
            <a className="btn btn-secondary" href={status.url} target="_blank" rel="noreferrer">
              <ExternalLink size={13} />
              Buka viewer
            </a>
          </div>
          <p className="hint" style={{ marginTop: 15 }}>
            Versi dibagikan: {status.sourceVersion}. Versi editor: {version}. Perubahan berikutnya tampil
            setelah Anda memperbarui versi berbagi.
          </p>
        </>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="banner" role="status">
          {notice}
        </div>
      )}
      {confirmRevoke ? (
        <>
          <p className="template-safe-note">
            Link ini akan berhenti bekerja. Salinan atau unduhan yang sudah dimiliki penerima tetap ada.
          </p>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setConfirmRevoke(false)}>
              Batal
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => void mutate(true)}>
              Cabut link
            </Button>
          </div>
        </>
      ) : (
        <>
          <label className="share-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            Saya sudah meninjau isi slide dan mengizinkan pemegang link melihatnya, termasuk teks manual dan
            gambar.
          </label>
          <div className="modal-footer">
            {status?.active && (
              <Button variant="danger" disabled={pending} onClick={() => setConfirmRevoke(true)}>
                Cabut link
              </Button>
            )}
            <Button disabled={loading || pending || !status || !ack} onClick={() => void mutate()}>
              {pending && <Loader2 className="animate-spin" size={14} />}{' '}
              {status?.active ? 'Perbarui versi berbagi' : 'Aktifkan link berbagi'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
