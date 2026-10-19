'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, History, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Survey } from '@/lib/types';
import {
  cleaningFlagLabels,
  cleaningStatusLabels,
  cleaningStatuses,
  type CleaningConfig,
  type CleaningPage,
  type CleaningRow,
  type CleaningStatus,
} from '@/lib/cleaning-model';
import { Badge, Button, EmptyState, Modal } from './ui';
import '@/app/cleaning.css';

function formatTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
function ReviewBadge({ row }: { row: CleaningRow }) {
  const status = row.review && !row.review.stale ? row.review.status : 'unreviewed';
  return (
    <Badge tone={status === 'valid' ? 'green' : status === 'needs_verification' ? 'amber' : 'neutral'}>
      {row.review?.stale ? 'Jawaban berubah · tinjau ulang' : cleaningStatusLabels[status]}
    </Badge>
  );
}
async function jsonResponse(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal. Coba lagi.');
  return result;
}

function CleaningComparison({
  survey,
  row,
  onSaved,
}: {
  survey: Survey;
  row: CleaningRow;
  onSaved: () => void;
}) {
  const [comparison, setComparison] = useState<CleaningPage | null>(null);
  const [source, setSource] = useState(row);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<CleaningStatus>(row.review?.status ?? 'unreviewed');
  const [reason, setReason] = useState(row.review?.reason ?? '');
  const [pending, setPending] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/surveys/${survey.id}/cleaning?focus=${encodeURIComponent(row.id)}&page=${page}&pageSize=10`, {
      signal: controller.signal,
    })
      .then(jsonResponse)
      .then((result: CleaningPage) => {
        if (!controller.signal.aborted) {
          const current = result.rows.find((item) => item.id === row.id);
          if (current) setSource(current);
          if (!initialized.current && current) {
            initialized.current = true;
            setStatus(current.review?.status ?? 'unreviewed');
            setReason(current.review?.reason ?? '');
          }
          setComparison(result);
          setLoadedPage(page);
          setError('');
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Perbandingan gagal dimuat.');
      });
    return () => controller.abort();
  }, [survey.id, row.id, page, retry]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await fetch(`/api/surveys/${survey.id}/cleaning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          submissionId: source.id,
          status,
          reason,
          revision: source.revision,
          expectedReviewedAt: source.review?.reviewedAt ?? null,
        }),
      }).then(jsonResponse);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Tinjauan gagal disimpan.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="cleaning-comparison">
      <p className="hint">
        Respons yang ditinjau: <strong>{row.id.slice(0, 8)}</strong>. Kelompok ini menampilkan kesamaan dengan
        respons tersebut. Nomor rekening disamarkan.
      </p>
      {error && (
        <div className="banner banner-error" role="alert">
          <p>{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setError('');
              setLoadedPage(0);
              setPage(1);
              setRetry((value) => value + 1);
            }}
            disabled={pending}
          >
            Muat ulang perbandingan
          </Button>
        </div>
      )}
      {!comparison && !error ? (
        <p role="status">
          <Loader2 className="animate-spin" size={16} /> Memuat perbandingan…
        </p>
      ) : comparison ? (
        <>
          <div className="cleaning-comparison-scroll" aria-busy={loadedPage !== page}>
            <table>
              <caption>Perbandingan jawaban ({comparison.filtered} respons)</caption>
              <thead>
                <tr>
                  <th scope="col">Pertanyaan</th>
                  {comparison.rows.map((item) => (
                    <th scope="col" key={item.id}>
                      {item.id === row.id ? 'Sedang ditinjau' : item.id.slice(0, 8)}
                      <small>{formatTime(item.submittedAt)}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {survey.questions.map((question) => (
                  <tr key={question.id}>
                    <th scope="row">{question.label}</th>
                    {comparison.rows.map((item) => {
                      const answer = item.comparison?.find((entry) => entry.questionId === question.id);
                      return (
                        <td key={item.id}>
                          {answer?.value || '—'}
                          {answer?.truncated && <small>Dipendekkan. Buka tab Data untuk isi lengkap.</small>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cleaning-pagination">
            <span>
              Halaman {comparison.page} dari{' '}
              {Math.max(1, Math.ceil(comparison.filtered / comparison.pageSize))}
            </span>
            <Button
              variant="secondary"
              aria-label="Perbandingan sebelumnya"
              disabled={page <= 1 || loadedPage !== page}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              aria-label="Perbandingan berikutnya"
              disabled={page * comparison.pageSize >= comparison.filtered || loadedPage !== page}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </>
      ) : null}
      {source.review && (
        <div className="banner">
          <p>
            {source.review.stale
              ? 'Jawaban telah dikoreksi sejak tinjauan terakhir. Tinjau kembali sebelum menyimpan.'
              : `Tinjauan terakhir: ${formatTime(source.review.reviewedAt)}.`}
            <br />
            Status sebelumnya: {cleaningStatusLabels[source.review.status]}. Alasan: {source.review.reason}
          </p>
        </div>
      )}
      <form onSubmit={save} className="cleaning-review-form">
        <label className="field">
          Hasil tinjauan
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CleaningStatus)}
            disabled={pending || !comparison || loadedPage !== page}
          >
            {cleaningStatuses.map((value) => (
              <option key={value} value={value}>
                {cleaningStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Alasan / catatan tinjauan
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={1000}
            required
            disabled={pending || !comparison || loadedPage !== page}
            placeholder="Contoh: responden berbeda dengan nama yang sama; sudah diverifikasi melalui perusahaan."
          />
          <small>Hindari menyalin nomor rekening lengkap ke catatan.</small>
        </label>
        <p className="hint">
          Keputusan ini hanya menyimpan status dan riwayat. Jawaban, skor, dan jumlah dalam analisis tetap
          sama.
        </p>
        <Button
          type="submit"
          disabled={pending || !comparison || loadedPage !== page || reason.trim().length < 3}
        >
          {pending ? 'Menyimpan…' : 'Simpan tinjauan'}
        </Button>
      </form>
    </div>
  );
}

export function CleaningPanel({ survey }: { survey: Survey }) {
  const [data, setData] = useState<CleaningPage | null>(null);
  const [draft, setDraft] = useState<CleaningConfig>({});
  const [page, setPage] = useState(1);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [status, setStatus] = useState('all');
  const [flag, setFlag] = useState('all');
  const [reload, setReload] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<CleaningRow | null>(null);
  const [history, setHistory] = useState(false);
  const mappedVersion = useRef<string | undefined>(undefined);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    flaggedOnly: String(flaggedOnly),
    status,
    flag,
  }).toString();
  const requestKey = survey.id + ':' + survey.version + ':' + reload + ':' + query;
  const error = failure?.key === requestKey ? failure.message : '';
  const loading = loadedKey !== requestKey && !error;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/surveys/${survey.id}/cleaning?${query}`, { signal: controller.signal })
      .then(jsonResponse)
      .then((result: CleaningPage) => {
        if (!controller.signal.aborted) {
          setData(result);
          const configKey = survey.id + ':' + result.configUpdatedAt;
          if (mappedVersion.current !== configKey) {
            mappedVersion.current = configKey;
            setDraft(result.config);
          }
          setLoadedKey(requestKey);
          setFailure(null);
          if (result.page !== page) setPage(result.page);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setFailure({
            key: requestKey,
            message: cause instanceof Error ? cause.message : 'Cleaning data gagal dimuat.',
          });
      });
    return () => controller.abort();
  }, [survey.id, query, requestKey, page]);
  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setActionError('');
    setNotice('');
    try {
      await fetch(`/api/surveys/${survey.id}/cleaning`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'config', config: draft, expectedUpdatedAt: data.configUpdatedAt }),
      }).then(jsonResponse);
      setPage(1);
      setReload((value) => value + 1);
      setNotice('Pertanyaan identitas tersimpan. Indikasi dihitung ulang dari jawaban yang tersedia.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Pengaturan gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }
  const mappings = [
    { key: 'nameQuestionId' as const, label: 'Nama responden', types: ['text', 'textarea'] },
    {
      key: 'bankQuestionId' as const,
      label: 'Bank / penyedia rekening responden',
      types: ['text', 'choice'],
    },
    { key: 'accountQuestionId' as const, label: 'Nomor rekening responden', types: ['text'] },
  ];
  return (
    <div className="cleaning-panel">
      <div className="panel-intro">
        <div>
          <h2>Tinjau kualitas data.</h2>
          <p>Kesamaan nama, bank dan rekening, atau jawaban membantu memilih respons untuk diperiksa.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setReload((value) => value + 1);
            setNotice('');
          }}
          disabled={loading || saving}
        >
          <RefreshCw size={14} /> Muat ulang
        </Button>
      </div>
      <div className="banner">
        <ShieldCheck size={18} />
        <p>
          Indikasi bukan bukti kecurangan. Nama atau rekening bisa digunakan bersama, dan jawaban identik bisa
          sah. Tidak ada penghapusan otomatis, pengecualian respons, atau perubahan skor dari halaman ini.
        </p>
      </div>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      {actionError && (
        <p className="banner banner-error" role="alert">
          {actionError}
        </p>
      )}
      {notice && (
        <p className="banner" role="status">
          {notice}
        </p>
      )}
      <details className="card cleaning-settings" open={!data?.configUpdatedAt}>
        <summary>Atur pertanyaan identitas responden</summary>
        <p>
          Gunakan hanya pertanyaan yang memang ada di form. Sistem tidak menambahkan atau mewajibkan
          pengumpulan rekening. Data rekening surveyor terpisah dari pemeriksaan ini.
        </p>
        <form onSubmit={saveConfig}>
          <fieldset disabled={loading || saving || !data}>
            <div className="cleaning-mappings">
              {mappings.map((mapping) => (
                <label className="field" key={mapping.key}>
                  {mapping.label}
                  <select
                    value={draft[mapping.key] ?? ''}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [mapping.key]: event.target.value || undefined }))
                    }
                  >
                    <option value="">Tidak dipetakan</option>
                    {survey.questions
                      .filter((question) => mapping.types.includes(question.type))
                      .map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.label}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="hint">
              Nama memakai jawaban teks. Bank dan nomor rekening perlu dipilih bersama. Nomor rekening harus
              berupa teks agar angka nol di depan tetap tersimpan. Nilai kosong tidak dikelompokkan.
            </p>
            <Button type="submit" disabled={loading || saving || !data}>
              {saving ? 'Menyimpan…' : 'Simpan pengaturan identitas'}
            </Button>
          </fieldset>
        </form>
      </details>
      <section className="card cleaning-results" aria-busy={loading}>
        <div className="cleaning-toolbar">
          <label>
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(event) => {
                setFlaggedOnly(event.target.checked);
                setPage(1);
              }}
            />{' '}
            Hanya ada indikasi
          </label>
          <label>
            Status tinjauan
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua status</option>
              {cleaningStatuses.map((value) => (
                <option key={value} value={value}>
                  {cleaningStatusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jenis indikasi
            <select
              value={flag}
              onChange={(event) => {
                setFlag(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua indikasi</option>
              {Object.entries(cleaningFlagLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={() => setHistory(true)} disabled={!data}>
            <History size={14} /> Riwayat tinjauan
          </Button>
        </div>
        <div className="cleaning-result-count" role="status">
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Memeriksa kesamaan respons…
            </>
          ) : data ? (
            `${data.flagged} dari ${data.total} respons memiliki indikasi · ${data.filtered} sesuai filter`
          ) : (
            'Belum ada data.'
          )}
        </div>
        {!loading && data?.rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={24} />}
            title="Tidak ada respons sesuai filter."
            description="Indikasi membantu pemeriksaan dan tidak menentukan benar atau salahnya sebuah respons."
          />
        ) : (
          <div className="cleaning-table-scroll">
            <table>
              <caption className="sr-only">Respons untuk ditinjau</caption>
              <thead>
                <tr>
                  <th scope="col">Respons</th>
                  <th scope="col">Identitas yang dipetakan</th>
                  <th scope="col">Indikasi</th>
                  <th scope="col">Tinjauan</th>
                  <th scope="col">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.id.slice(0, 8)}</strong>
                      <small>{formatTime(row.submittedAt)}</small>
                    </td>
                    <td>
                      {data.config.nameQuestionId ? row.name : 'Nama tidak dipetakan'}
                      {data.config.accountQuestionId && (
                        <small>
                          {row.bank} · {row.accountMasked}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="cleaning-flags">
                        {row.flags.length
                          ? row.flags.map((item) => (
                              <Badge tone="amber" key={item.kind}>
                                {cleaningFlagLabels[item.kind]} · {item.count} respons
                              </Badge>
                            ))
                          : 'Tidak ada indikasi'}
                      </div>
                    </td>
                    <td>
                      <ReviewBadge row={row} />
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        disabled={loading}
                        onClick={() => {
                          setSelected(row);
                          setNotice('');
                        }}
                        aria-label={`Bandingkan dan tinjau respons ${row.id.slice(0, 8)}`}
                      >
                        <Eye size={14} /> Tinjau
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="cleaning-pagination">
            <span>
              Halaman {data.page} dari {Math.max(1, Math.ceil(data.filtered / data.pageSize))}
            </span>
            <Button
              variant="secondary"
              disabled={loading || data.page <= 1}
              onClick={() => setPage((value) => value - 1)}
              aria-label="Halaman cleaning sebelumnya"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              disabled={loading || data.page * data.pageSize >= data.filtered}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Halaman cleaning berikutnya"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </section>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Bandingkan dan tinjau respons"
        description="Kesamaan ditampilkan untuk pemeriksaan manual. Tinjauan tidak mengubah jawaban atau analisis."
        wide
      >
        {selected && (
          <CleaningComparison
            key={selected.id}
            survey={survey}
            row={selected}
            onSaved={() => {
              setSelected(null);
              setReload((value) => value + 1);
              setNotice('Tinjauan tersimpan beserta aktor dan waktunya.');
            }}
          />
        )}
      </Modal>
      <Modal
        open={history}
        onOpenChange={setHistory}
        title="Riwayat tinjauan cleaning"
        description="100 keputusan terbaru untuk survei ini. Riwayat koreksi jawaban tersedia pada tab Data."
        wide
      >
        <div className="cleaning-history">
          {data?.audit.length ? (
            data.audit.map((entry) => (
              <article key={entry.id}>
                <strong>
                  {entry.submissionId.slice(0, 8)} · {cleaningStatusLabels[entry.status]}
                </strong>
                <p>{entry.reason}</p>
                <small>
                  {formatTime(entry.at)} · Revisi jawaban {entry.revision} · ID pengelola: {entry.actor}
                </small>
              </article>
            ))
          ) : (
            <p className="hint">Belum ada keputusan tinjauan yang disimpan.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
