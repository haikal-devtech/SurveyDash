'use client';
import { useEffect, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  Search,
  Download,
  RefreshCw,
  Columns3,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Table2,
  Pencil,
  Eye,
  Loader2,
} from 'lucide-react';
import type { Answer, Question, ResponsePage, Submission, Survey } from '@/lib/types';
import { answerLabel } from '@/lib/model';
import { Button, Badge, EmptyState, Modal } from './ui';
import { QuestionInput } from './question-input';

function EditableCell({
  question: q,
  row,
  onCommit,
  readOnly,
}: {
  question: Question;
  row: Submission;
  onCommit: (q: Question, row: Submission, value: Answer) => Promise<boolean>;
  readOnly: boolean;
}) {
  const value = row.answers[q.id] ?? '';
  const [draft, setDraft] = useState(String(value));
  const [pending, setPending] = useState(false);
  const [modal, setModal] = useState(false);
  const [multiple, setMultiple] = useState<Answer>(value);
  const cancelled = useRef(false);
  async function commit(next: Answer) {
    if (JSON.stringify(next) === JSON.stringify(value)) return;
    setPending(true);
    const ok = await onCommit(q, row, next);
    if (!ok) setDraft(String(value));
    setPending(false);
  }
  if (readOnly) return <span className="cell-readonly">{answerLabel(q, value)}</span>;
  if (q.type === 'choice' || q.type === 'rating')
    return (
      <select
        className="cell-input"
        aria-label={`${q.label}, respons ${row.id.slice(0, 8)}`}
        disabled={pending}
        value={String(value)}
        onChange={(e) => void commit(e.target.value)}
      >
        <option value="">—</option>
        {q.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  if (q.type === 'checkbox')
    return (
      <>
        <button className="cell-input" style={{ textAlign: 'left' }} onClick={() => setModal(true)}>
          {answerLabel(q, value)}
        </button>
        <Modal open={modal} onOpenChange={setModal} title="Koreksi jawaban">
          <QuestionInput question={q} value={multiple} onChange={setMultiple} />
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Batal
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const ok = await onCommit(q, row, multiple);
                setPending(false);
                if (ok) setModal(false);
              }}
            >
              Simpan koreksi
            </Button>
          </div>
        </Modal>
      </>
    );
  return (
    <input
      className="cell-input"
      aria-label={`${q.label}, respons ${row.id.slice(0, 8)}`}
      disabled={pending}
      type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
      value={draft}
      maxLength={10000}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (cancelled.current) {
          cancelled.current = false;
          return;
        }
        void commit(q.type === 'number' && draft !== '' ? Number(draft) : draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function ResponseTable({
  survey,
  onRefresh,
  onEdited,
  onError,
}: {
  survey: Survey;
  onRefresh: () => void;
  onEdited: (s: Submission) => void;
  onError: (message: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'submittedAt', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [pageData, setPageData] = useState<ResponsePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<Submission | null>(null);
  const rows = pageData?.rows ?? [];
  const audit = pageData?.audit ?? [];
  const query = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    pageSize: String(pagination.pageSize),
    search: querySearch,
    sort: sorting[0]?.id ?? 'submittedAt',
    direction: sorting[0]?.desc === false ? 'asc' : 'desc',
  }).toString();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuerySearch(search);
      setPagination((value) => ({ ...value, pageIndex: 0 }));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    fetch('/api/surveys/' + survey.id + '/responses?' + query, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        setPageData(data);
        const pageIndex = data.page - 1;
        setPagination((value) => (value.pageIndex === pageIndex ? value : { ...value, pageIndex }));
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setLoadError(error instanceof Error ? error.message : 'Jawaban gagal dimuat.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [survey.id, query, reload]);
  async function commit(q: Question, row: Submission, value: Answer) {
    try {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: row.id, questionId: q.id, value, revision: row.revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPageData((previous) =>
        previous
          ? {
              ...previous,
              rows: previous.rows.map((item) => (item.id === data.id ? data : item)),
            }
          : previous,
      );
      setReload((value) => value + 1);
      onEdited(data);
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Koreksi gagal disimpan.');
      return false;
    }
  }
  const columns: ColumnDef<Submission>[] = [
    {
      id: 'index',
      header: '#',
      cell: (info) => pagination.pageIndex * pagination.pageSize + info.row.index + 1,
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: 'submittedAt',
      header: 'Waktu pengiriman',
      accessorFn: (r) =>
        new Date(r.submittedAt).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      cell: (info) => (
        <span style={{ padding: '0 5px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
          {String(info.getValue())}
        </span>
      ),
    },
    {
      id: 'surveyor',
      header: 'Surveyor',
      accessorFn: (row) =>
        row.surveyor ? row.surveyor.fullName + ' · @' + row.surveyor.username : 'Link langsung',
      cell: (info) => <span className="cell-readonly">{String(info.getValue())}</span>,
    },
    ...survey.questions.map((q) => ({
      id: 'question:' + q.id,
      header: q.label,
      accessorFn: (r: Submission) => answerLabel(q, r.answers[q.id]),
      cell: (info: { row: { original: Submission } }) => (
        <EditableCell
          key={`${info.row.original.id}:${info.row.original.revision}:${q.id}`}
          question={q}
          row={info.row.original}
          onCommit={commit}
          readOnly={!editing || loading}
        />
      ),
    })),
    {
      id: 'details',
      header: 'Detail',
      enableSorting: false,
      enableHiding: false,
      cell: (info) => (
        <Button
          variant="ghost"
          aria-label={`Detail respons ${info.row.original.id.slice(0, 8)}`}
          onClick={() => setDetails(info.row.original)}
        >
          <Eye size={14} />
        </Button>
      ),
    },
  ];
  // TanStack exposes mutable getters; keep this hook outside compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnVisibility: visibility, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((value) => ({ ...value, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: pageData?.filtered ?? 0,
  });
  async function exportData(format: 'csv' | 'xlsx') {
    setExporting(true);
    try {
      const response = await fetch('/api/surveys/' + survey.id + '/responses?' + query + '&format=' + format);
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = (survey.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'survei') + '.' + format;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unduhan gagal dibuat.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <Modal
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        title="Unduh data"
        description="Unduh seluruh hasil pencarian, termasuk halaman lainnya."
      >
        <div className="download-options">
          <Button disabled={exporting} onClick={() => void exportData('xlsx')}>
            <Download size={17} />
            {exporting ? 'Menyiapkan…' : 'Excel (.xlsx)'}
          </Button>
          <Button variant="secondary" disabled={exporting} onClick={() => void exportData('csv')}>
            CSV (.csv)
          </Button>
        </div>
        <p className="hint">
          Excel dan CSV bisa diunggah ke Google Sheets. Data asli impor yang belum masuk grafik juga
          disertakan.
        </p>
      </Modal>
      <div className="panel-intro">
        <div>
          <h2>Semua jawaban, satu tempat.</h2>
          <p>Jawaban ditampilkan dalam mode baca. Aktifkan koreksi data untuk mengubah sel dengan riwayat.</p>
        </div>
        <Badge tone="purple">{pageData?.total ?? survey.responseCount ?? 0} respons</Badge>
      </div>
      <section className="card">
        <div className="data-toolbar">
          <div className="search-input">
            <Search size={13} />
            <input
              className="input"
              aria-label="Cari jawaban"
              placeholder="Cari di seluruh jawaban…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="actions">
            <Button variant="secondary" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>
              <Pencil size={13} />
              {editing ? 'Selesai koreksi' : 'Koreksi data'}
            </Button>
            <details style={{ position: 'relative' }}>
              <summary className="btn btn-secondary" style={{ listStyle: 'none' }}>
                <Columns3 size={13} />
                Kolom
              </summary>
              <div
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 45,
                  width: 240,
                  maxHeight: 320,
                  overflow: 'auto',
                  zIndex: 10,
                  padding: 12,
                }}
              >
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.getCanHide())
                  .map((c) => (
                    <label key={c.id} style={{ display: 'flex', gap: 7, padding: 7, fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={c.getIsVisible()}
                        onChange={c.getToggleVisibilityHandler()}
                      />
                      {String(c.columnDef.header)}
                    </label>
                  ))}
              </div>
            </details>
            <Button
              variant="secondary"
              onClick={() => {
                setHistory(true);
                setReload((value) => value + 1);
                onRefresh();
              }}
            >
              <History size={13} />
              Riwayat
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDownloadOpen(true)}
              disabled={exporting || !pageData?.filtered}
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {exporting ? 'Menyiapkan…' : 'Unduh data'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setReload((value) => value + 1);
                onRefresh();
              }}
              aria-label="Muat ulang respons"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
        {loading && !pageData ? (
          <div className="empty-state" role="status">
            <Loader2 size={22} className="animate-spin" />
            <p>Memuat jawaban…</p>
          </div>
        ) : loadError ? (
          <div className="empty-state" role="alert">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
              Coba lagi
            </Button>
          </div>
        ) : !pageData?.total ? (
          <EmptyState
            icon={<Table2 size={24} />}
            title="Jawaban pertama akan muncul di sini."
            description="Buka form dan bagikan linknya. Setiap pengiriman menjadi baris baru di tabel ini."
          />
        ) : (
          <>
            <div className="table-scroll" aria-busy={loading}>
              <table className="data-table">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            header.column.getIsSorted() === 'asc'
                              ? 'ascending'
                              : header.column.getIsSorted() === 'desc'
                                ? 'descending'
                                : header.column.getCanSort()
                                  ? 'none'
                                  : undefined
                          }
                        >
                          {header.column.getCanSort() ? (
                            <button
                              style={{
                                border: 0,
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: 'inherit',
                                font: 'inherit',
                              }}
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={'Urutkan ' + String(header.column.columnDef.header)}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && <ArrowUpDown size={10} />}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!table.getRowModel().rows.length && (
                <div className="empty-state">
                  <p>Tidak ada jawaban yang cocok dengan pencarian.</p>
                </div>
              )}
            </div>
            <div className="table-pagination">
              <span>
                {loading ? 'Memuat…' : String(pageData?.filtered ?? 0) + ' respons'} · Halaman{' '}
                {table.getState().pagination.pageIndex + 1} dari {Math.max(1, table.getPageCount())}
              </span>
              <div className="actions">
                <Button
                  variant="ghost"
                  disabled={loading || !table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="ghost"
                  disabled={loading || !table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      <p className="hint" style={{ marginTop: 13 }}>
        Unduhan memuat seluruh hasil pencarian, termasuk jawaban pada halaman lain. Skor dihitung dari pilihan
        jawaban yang tervalidasi. Jawaban kosong ditampilkan sebagai “—”, bukan skor 1.
      </p>
      <Modal
        open={history}
        onOpenChange={setHistory}
        wide
        title="Riwayat koreksi jawaban"
        description="Setiap perubahan menyimpan nilai sebelum dan sesudahnya."
      >
        {audit.length ? (
          <div className="table-scroll">
            <table className="widget-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pertanyaan</th>
                  <th>Sebelum</th>
                  <th>Sesudah</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => {
                  const q = survey.questions.find((q) => q.id === a.questionId);
                  return (
                    <tr key={a.id}>
                      <td>{new Date(a.at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                      <td>{q?.label ?? a.questionId}</td>
                      <td>{q ? answerLabel(q, a.before ?? undefined) : String(a.before ?? '—')}</td>
                      <td>{q ? answerLabel(q, a.after) : String(a.after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint">Belum ada koreksi jawaban.</p>
        )}
      </Modal>
      {details && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
          title="Detail respons"
          description={new Date(details.submittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          wide
        >
          <div className="response-details">
            <div>
              <strong>Sumber link</strong>
              <p>
                {details.surveyor
                  ? details.surveyor.fullName + ' · @' + details.surveyor.username
                  : 'Link langsung / tanpa atribusi surveyor'}
              </p>
            </div>
            {details.questionSnapshot.map((q) => (
              <div key={q.id}>
                <strong>{q.label}</strong>
                <p>{answerLabel(q, details.answers[q.id])}</p>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setDetails(null)}>
              Tutup
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
