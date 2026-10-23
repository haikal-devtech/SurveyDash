'use client';
import { useState } from 'react';
import { workspaceFetch } from '@/lib/workspace-request';
import type { Survey, Submission } from '@/lib/types';
import type { CrossTab } from '@/lib/research-model';
import { emptyResponseFilters, responseFilterParams } from '@/lib/response-filters';
import { ResponseFilters } from './response-filters';
import { Button } from './ui';
import { csvCell } from '@/lib/model';
import { useWorkspacePermissions } from './workspace-permissions';

export function ResponseWeightForm({
  surveyId,
  response,
  onSaved,
}: {
  surveyId: string;
  response: Submission;
  onSaved: () => void;
}) {
  const { canEdit } = useWorkspacePermissions();
  const [weight, setWeight] = useState(String(response.analysisWeight ?? 1)),
    [reason, setReason] = useState(''),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  if (!canEdit) return null;
  return (
    <details className="card" style={{ padding: 14, marginTop: 20 }}>
      <summary>Bobot analisis</summary>
      <p className="hint">
        Bobot diatur peneliti; nilai bawaan 1. Koreksi jawaban membatalkan bobot lama sampai ditinjau ulang.
        Nilai IKM standar tetap memakai perhitungan mentah.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage('');
          try {
            const result = await workspaceFetch(`/api/surveys/${surveyId}/research`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId: response.id,
                revision: response.revision,
                weight: Number(weight),
                reason,
              }),
            });
            const data = await result.json();
            if (!result.ok) throw new Error(data.error);
            setMessage('Bobot tersimpan.');
            onSaved();
          } catch (failure) {
            setMessage(failure instanceof Error ? failure.message : 'Gagal menyimpan.');
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="field">
          Bobot
          <input
            type="number"
            min={0.000001}
            max={1000}
            step="any"
            required
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </label>
        <label className="field">
          Alasan / acuan pembobotan
          <textarea
            minLength={5}
            maxLength={1000}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan bobot'}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
export function ResearchPanel({ survey }: { survey: Survey }) {
  const questions = survey.questions.filter((question) => ['choice', 'rating'].includes(question.type));
  const [row, setRow] = useState(questions[0]?.id ?? ''),
    [column, setColumn] = useState(questions[1]?.id ?? ''),
    [weighted, setWeighted] = useState(false);
  const [filters, setFilters] = useState({ ...emptyResponseFilters }),
    [result, setResult] = useState<CrossTab | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  function download() {
    if (!result) return;
    const rows = [['Baris', 'Kolom', 'Jumlah mentah', 'Jumlah berbobot', 'Persentase']];
    result.cells.forEach((cells, r) =>
      cells.forEach((cell, c) =>
        rows.push([
          result.rows[r],
          result.columns[c],
          String(cell.count),
          String(cell.weighted),
          String(cell.percent),
        ]),
      ),
    );
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tabulasi-silang.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <details className="card" style={{ padding: 18, marginBlock: 20 }}>
      <summary>Tabulasi silang dan pembobotan</summary>
      {questions.length < 2 ? (
        <p className="hint">
          Tambahkan minimal dua pertanyaan pilihan tunggal atau skala untuk membuat tabulasi silang.
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError('');
            setResult(null);
            try {
              const params = new URLSearchParams({
                row,
                column,
                weighted: String(weighted),
                dataset: survey.dataset ?? 'all',
                ...responseFilterParams(filters),
              });
              const response = await workspaceFetch(`/api/surveys/${survey.id}/research?${params}`);
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setResult(data);
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Gagal memuat tabulasi.');
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="actions">
            {[
              ['Baris', row, setRow],
              ['Kolom', column, setColumn],
            ].map(([label, value, setter]) => (
              <label className="field" key={String(label)}>
                {String(label)}
                <select
                  value={String(value)}
                  disabled={pending}
                  onChange={(event) => {
                    (setter as typeof setRow)(event.target.value);
                    setResult(null);
                  }}
                >
                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={weighted}
              disabled={pending}
              onChange={(event) => {
                setWeighted(event.target.checked);
                setResult(null);
              }}
            />{' '}
            Gunakan bobot manual dari detail respons
          </label>
          <ResponseFilters
            value={filters}
            onChange={(value) => {
              setFilters(value);
              setResult(null);
            }}
          />
          <Button type="submit" disabled={pending || row === column}>
            {pending ? 'Menghitung…' : 'Tampilkan tabulasi'}
          </Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <section style={{ marginTop: 20 }}>
          <p>
            {result.paired} dari {result.total} respons memiliki kedua jawaban. Dataset:{' '}
            {result.dataset === 'accepted' ? 'diterima' : 'mentah'}.{' '}
            {result.weighted ? `Jumlah bobot: ${result.weightedTotal.toLocaleString('id-ID')}.` : ''}
          </p>
          <p className="hint">
            Persentase memakai seluruh respons yang menjawab kedua pertanyaan dalam filter ini. Tidak ada
            perhitungan margin of error otomatis.
          </p>
          <div style={{ overflowX: 'auto' }} role="region" aria-label="Tabel silang" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Baris / Kolom</th>
                  {result.columns.map((label, index) => (
                    <th key={index}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.cells.map((cells, r) => (
                  <tr key={r}>
                    <th>{result.rows[r]}</th>
                    {cells.map((cell, c) => (
                      <td key={c}>
                        {(result.weighted ? cell.weighted : cell.count).toLocaleString('id-ID', {
                          maximumFractionDigits: 2,
                        })}
                        <small style={{ display: 'block' }}>
                          {cell.percent.toFixed(1)}% · n={cell.count}
                        </small>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" onClick={download}>
            Unduh CSV tabulasi
          </Button>
        </section>
      )}
    </details>
  );
}
