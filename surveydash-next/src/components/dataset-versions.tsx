'use client';
import { useEffect, useState } from 'react';
import { workspaceFetch } from '@/lib/workspace-request';
import type { Survey } from '@/lib/types';
import type { DatasetVersion } from '@/lib/dataset-model';
import { Button } from './ui';
import { useWorkspacePermissions } from './workspace-permissions';
import type { Distribution } from '@/lib/types';
export function DatasetVersions({ survey }: { survey: Survey }) {
  const { canEdit } = useWorkspacePermissions();
  const [summary, setSummary] = useState<{
    id: string;
    total: number;
    weightedTotal: number;
    ikm: number | null;
    questions: { id: string; label: string; answered: number; distribution: Distribution[] }[];
  } | null>(null);
  const [open, setOpen] = useState(false),
    [versions, setVersions] = useState<DatasetVersion[]>([]),
    [name, setName] = useState(''),
    [notes, setNotes] = useState(''),
    [acknowledged, setAcknowledged] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    workspaceFetch(`/api/surveys/${survey.id}/datasets`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setVersions(data.versions);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Gagal memuat versi.');
      });
    return () => controller.abort();
  }, [open, survey.id, epoch]);
  return (
    <details
      className="card"
      style={{ padding: 18, marginBlock: 20 }}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Versi dataset final</summary>
      <p>
        Kunci salinan hasil setelah peninjauan. Salinan menyimpan pertanyaan, jawaban, bobot, wilayah dan
        metode saat itu; koreksi berikutnya tidak mengubahnya.
      </p>
      {!canEdit ? (
        <p className="hint">Mode baca. Pemilik dan Editor dapat mengunci versi final.</p>
      ) : survey.status !== 'closed' ? (
        <p className="hint">Tutup pengumpulan survei terlebih dahulu untuk membuat versi final.</p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError('');
            try {
              const response = await workspaceFetch(`/api/surveys/${survey.id}/datasets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name,
                  methodNotes: notes,
                  dataset: survey.dataset ?? 'all',
                  acknowledged,
                }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setEpoch((value) => value + 1);
              setName('');
              setNotes('');
              setAcknowledged(false);
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Gagal mengunci hasil.');
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            Nama versi
            <input
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hasil final tahap 2"
            />
          </label>
          <label className="field">
            Catatan metode dan peninjauan
            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              required
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />{' '}
            Saya telah meninjau dataset {survey.dataset === 'accepted' ? 'respons diterima' : 'mentah'} yang
            akan dikunci.
          </label>
          <div style={{ marginTop: 12 }}>
            <Button type="submit" disabled={pending}>
              Kunci versi dataset
            </Button>
          </div>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {versions.map((version) => (
        <article
          key={version.id}
          style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}
        >
          <strong>{version.name}</strong>
          <p>
            {version.count} respons · {version.dataset === 'accepted' ? 'Diterima' : 'Mentah'} ·{' '}
            {new Date(version.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          </p>
          <p>{version.methodNotes}</p>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                const response = await workspaceFetch(
                  `/api/surveys/${survey.id}/datasets?version=${version.id}&format=summary`,
                );
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setSummary({ ...data, id: version.id });
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Ringkasan gagal dimuat.');
              } finally {
                setPending(false);
              }
            }}
          >
            Lihat ringkasan final
          </Button>{' '}
          <Button
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                const response = await workspaceFetch(
                  `/api/surveys/${survey.id}/datasets?version=${version.id}&format=csv`,
                );
                if (!response.ok) throw new Error((await response.json()).error);
                const url = URL.createObjectURL(await response.blob());
                const link = document.createElement('a');
                link.href = url;
                link.download = 'dataset-' + version.id + '.csv';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Unduhan gagal.');
              } finally {
                setPending(false);
              }
            }}
          >
            Unduh data versi ini
          </Button>
          {summary?.id === version.id && (
            <div aria-live="polite" style={{ marginTop: 16 }}>
              <p>
                {summary.total} respons · Jumlah bobot {summary.weightedTotal.toLocaleString('id-ID')}
                {summary.ikm == null ? '' : ` · IKM ${summary.ikm.toLocaleString('id-ID')}`}
              </p>
              <p className="hint">
                Distribusi berikut memakai hitungan mentah versi final. Bobot tidak mengubah metode IKM.
              </p>
              {summary.questions.map((question) => (
                <details key={question.id} style={{ marginBlock: 12 }}>
                  <summary>
                    {question.label} · {question.answered} terisi
                  </summary>
                  {question.distribution.map((entry, index) => (
                    <p
                      key={index}
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12 }}
                    >
                      <span style={{ overflowWrap: 'anywhere' }}>{entry.name}</span>
                      <strong>{entry.count}</strong>
                    </p>
                  ))}
                </details>
              ))}
            </div>
          )}
        </article>
      ))}
    </details>
  );
}
