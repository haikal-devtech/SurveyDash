'use client';
import { useEffect, useEffectEvent, useState } from 'react';
import { Button, Modal } from './ui';
import { workspaceFetch } from '@/lib/workspace-request';
import { provinceName } from '@/lib/provinces';
import type { FieldworkData, FieldworkRow } from '@/lib/fieldwork-model';
import type { WorkspaceRole } from '@/lib/workspace-role-model';
import { csvCell } from '@/lib/model';
import '@/app/fieldwork.css';

function FieldworkDialog({
  row,
  data,
  payment,
  onClose,
  onSaved,
}: {
  row: FieldworkRow;
  data: FieldworkData;
  payment: boolean;
  onClose: () => void;
  onSaved: (data: FieldworkData) => void;
}) {
  const [city, setCity] = useState(row.city),
    [district, setDistrict] = useState(row.district),
    [coordinator, setCoordinator] = useState(row.coordinatorId ?? ''),
    [target, setTarget] = useState(row.target?.toString() ?? '');
  const [amount, setAmount] = useState(String(row.paymentAmount ?? 0)),
    [status, setStatus] = useState(row.paymentStatus ?? 'pending'),
    [note, setNote] = useState('');
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={payment ? 'Catatan honor' : 'Atur penugasan lapangan'}
      description={row.name + ' · ' + row.survey}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError('');
          try {
            const response = await workspaceFetch('/api/workspace/fieldwork', {
              method: payment ? 'POST' : 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(
                payment
                  ? { assignmentId: row.assignmentId, amount: Number(amount), status, note }
                  : {
                      assignmentId: row.assignmentId,
                      city,
                      district,
                      coordinatorId: coordinator || null,
                      target: target ? Number(target) : null,
                    },
              ),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            onSaved(result);
            onClose();
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Gagal menyimpan.');
          } finally {
            setPending(false);
          }
        }}
      >
        {payment ? (
          <>
            <p>
              {row.accepted} dari {row.all} respons diterima. Catatan ini tidak menjalankan transfer.
            </p>
            <label className="field">
              Jumlah (Rp)
              <input
                type="number"
                min={0}
                max={10000000000}
                step={1}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="field">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'pending' | 'paid')}
              >
                <option value="pending">Belum dibayar</option>
                <option value="paid">Sudah dibayar di luar aplikasi</option>
              </select>
            </label>
            <label className="field">
              Catatan / referensi pembayaran
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              Koordinator
              <select value={coordinator} onChange={(event) => setCoordinator(event.target.value)}>
                <option value="">Belum ditentukan</option>
                {data.coordinators.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Kabupaten / kota
              <input maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
            <label className="field">
              Kecamatan
              <input maxLength={100} value={district} onChange={(event) => setDistrict(event.target.value)} />
            </label>
            <p className="hint">
              Wilayah rinci diisi oleh pengelola sebagai catatan penugasan. Provinsi diatur melalui halaman
              Surveyor.
            </p>
            <label className="field">
              Target respons diterima
              <input
                type="number"
                min={1}
                max={10000000}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="Belum ditentukan"
              />
            </label>
            <p className="hint">
              Target tugas terpisah dari target provinsi. Isian tetap diterima setelah target terlewati.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="banner banner-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}
export function FieldworkPanel({ initialData, role }: { initialData: FieldworkData; role: WorkspaceRole }) {
  const [data, setData] = useState(initialData),
    [query, setQuery] = useState(''),
    [survey, setSurvey] = useState('all'),
    [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ row: FieldworkRow; payment: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  async function refresh() {
    if (document.visibilityState === 'hidden') return;
    setPending(true);
    try {
      const response = await workspaceFetch('/api/workspace/fieldwork');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memperbarui.');
    } finally {
      setPending(false);
    }
  }
  const sync = useEffectEvent(refresh);
  useEffect(() => {
    const timer = setInterval(() => void sync(), 30000);
    return () => clearInterval(timer);
  }, []);
  const rows = data.rows.filter(
    (row) =>
      (survey === 'all' || row.surveyId === survey) &&
      [row.name, row.username, row.city, row.district, row.coordinatorName, provinceName(row.provinceId)]
        .join(' ')
        .toLocaleLowerCase('id-ID')
        .includes(query.trim().toLocaleLowerCase('id-ID')),
  );
  const surveys = [...new Map(data.rows.map((row) => [row.surveyId, row.survey])).entries()];
  function exportCsv() {
    const headers = [
      'Survei',
      'Surveyor',
      'Username',
      'Provinsi tugas saat ini',
      'Kabupaten/kota',
      'Kecamatan',
      'Koordinator',
      'Masuk',
      'Diterima',
      'Perlu verifikasi',
      'Dikeluarkan',
      'Target diterima',
      'Aktivitas terakhir',
    ];
    const content =
      '\uFEFF' +
      [
        headers,
        ...rows.map((row) => [
          row.survey,
          row.name,
          row.username,
          provinceName(row.provinceId),
          row.city,
          row.district,
          row.coordinatorName,
          row.all,
          row.accepted,
          row.held,
          row.excluded,
          row.target ?? '',
          row.lastResponse ?? '',
        ]),
      ]
        .map((row) => row.map((cell) => csvCell(String(cell))).join(','))
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'operasi-lapangan.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="fieldwork-panel">
      <div className="page-heading">
        <div>
          <h1>Operasi lapangan</h1>
          <p>Penugasan, kualitas respons, wilayah dan koordinator.</p>
        </div>
        <Button variant="secondary" disabled={pending} onClick={() => void refresh()}>
          Perbarui
        </Button>
      </div>
      <div className="stats-grid">
        {[
          ['Penugasan', rows.length],
          ['Respons masuk', rows.reduce((sum, row) => sum + row.all, 0)],
          ['Diterima', rows.reduce((sum, row) => sum + row.accepted, 0)],
          ['Perlu verifikasi', rows.reduce((sum, row) => sum + row.held, 0)],
        ].map(([label, value]) => (
          <div className="stat-card" key={String(label)}>
            <p>{label}</p>
            <strong className="stat-value">{Number(value).toLocaleString('id-ID')}</strong>
          </div>
        ))}
      </div>
      <section className="card fieldwork-card">
        <div className="fieldwork-filters">
          <label className="field">
            Cari surveyor / wilayah
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nama, username, kota…"
            />
          </label>
          <label className="field">
            Survei
            <select value={survey} onChange={(event) => setSurvey(event.target.value)}>
              <option value="all">Semua survei</option>
              {surveys.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={exportCsv}>
            Unduh rekap CSV
          </Button>
        </div>
        {error && (
          <p role="alert" className="banner banner-error">
            {error}
          </p>
        )}
        <div className="fieldwork-table" role="region" aria-label="Rekap lapangan" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  'Surveyor / survei',
                  'Wilayah',
                  'Koordinator',
                  'Kualitas',
                  'Target diterima',
                  'Terakhir',
                  'Tindakan',
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.assignmentId}>
                  <td data-label="Surveyor / survei">
                    <strong>{row.name}</strong>
                    <small>
                      @{row.username} · {row.active ? 'Aktif' : 'Nonaktif'}
                    </small>
                    <small>{row.survey}</small>
                  </td>
                  <td data-label="Wilayah">
                    {provinceName(row.provinceId)}
                    <small>
                      {[row.city, row.district].filter(Boolean).join(' / ') || 'Wilayah rinci belum diisi'}
                    </small>
                  </td>
                  <td data-label="Koordinator">{row.coordinatorName || 'Belum ditentukan'}</td>
                  <td data-label="Kualitas">
                    {row.all} masuk
                    <small>
                      {row.accepted} diterima · {row.held} verifikasi · {row.excluded} dikeluarkan
                    </small>
                  </td>
                  <td data-label="Target diterima">
                    {row.target === null ? (
                      'Belum diatur'
                    ) : (
                      <>
                        {row.accepted} / {row.target}
                        <small>{Math.round((row.accepted / row.target) * 100)}%</small>
                      </>
                    )}
                  </td>
                  <td data-label="Terakhir (WIB)">
                    {row.lastResponse
                      ? new Date(row.lastResponse).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Belum ada respons'}
                  </td>
                  <td data-label="Tindakan">
                    {role !== 'viewer' && (
                      <Button variant="ghost" onClick={() => setDialog({ row, payment: false })}>
                        Wilayah & target
                      </Button>
                    )}
                    {(role === 'owner' || role === 'editor') && (
                      <Button variant="ghost" onClick={() => setDialog({ row, payment: true })}>
                        Honor · {row.paymentStatus === 'paid' ? 'Tercatat dibayar' : 'Belum dibayar'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="hint">Belum ada penugasan yang cocok. Undang surveyor melalui halaman Surveyor.</p>
        )}
      </section>
      {dialog && (
        <FieldworkDialog
          key={dialog.row.assignmentId + String(dialog.payment)}
          row={dialog.row}
          data={data}
          payment={dialog.payment}
          onClose={() => setDialog(null)}
          onSaved={setData}
        />
      )}
    </div>
  );
}
