'use client';
import { useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
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
} from 'lucide-react';
import type { Answer, AuditEntry, Question, Submission, Survey } from '@/lib/types';
import { answerLabel, csvCell } from '@/lib/model';
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
  rows,
  audit,
  onRefresh,
  onEdited,
  onError,
}: {
  survey: Survey;
  rows: Submission[];
  audit: AuditEntry[];
  onRefresh: () => void;
  onEdited: (s: Submission) => void;
  onError: (message: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<Submission | null>(null);
  async function commit(q: Question, row: Submission, value: Answer) {
    try {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: row.id, questionId: q.id, value, revision: row.revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onEdited(data);
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Koreksi gagal disimpan.');
      return false;
    }
  }
  const columns: ColumnDef<Submission>[] = [
    { id: 'index', header: '#', cell: (info) => info.row.index + 1, enableHiding: false },
    {
      id: 'date',
      header: 'Waktu pengiriman',
      accessorFn: (r) =>
        new Date(r.submittedAt).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      cell: (info) => (
        <span style={{ padding: '0 5px', whiteSpace: 'nowrap', color: '#ac9ab8' }}>
          {String(info.getValue())}
        </span>
      ),
    },
    ...survey.questions.map((q) => ({
      id: q.id,
      header: q.label,
      accessorFn: (r: Submission) => answerLabel(q, r.answers[q.id]),
      cell: (info: { row: { original: Submission } }) => (
        <EditableCell
          key={`${info.row.original.id}:${info.row.original.revision}:${q.id}`}
          question={q}
          row={info.row.original}
          onCommit={commit}
          readOnly={!editing}
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
    state: { globalFilter: search, sorting, columnVisibility: visibility },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });
  function exportCsv() {
    const selected = table.getFilteredRowModel().rows.map((r) => r.original);
    const headers = ['ID respons', 'Waktu', ...survey.questions.map((q) => q.label)];
    const csv = [
      headers.map(csvCell).join(','),
      ...selected.map((row) =>
        [row.id, row.submittedAt, ...survey.questions.map((q) => answerLabel(q, row.answers[q.id]))]
          .map(csvCell)
          .join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="panel-intro">
        <div>
          <h2>Semua jawaban, satu tempat.</h2>
          <p>Jawaban ditampilkan dalam mode baca. Aktifkan koreksi data untuk mengubah sel dengan riwayat.</p>
        </div>
        <Badge tone="purple">{rows.length} respons</Badge>
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
                onRefresh();
              }}
            >
              <History size={13} />
              Riwayat
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              <Download size={13} />
              CSV
            </Button>
            <Button variant="ghost" onClick={onRefresh} aria-label="Muat ulang respons">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
        {!rows.length ? (
          <EmptyState
            icon={<Table2 size={24} />}
            title="Jawaban pertama akan muncul di sini."
            description="Buka form dan bagikan linknya. Setiap pengiriman menjadi baris baru di tabel ini."
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th key={header.id}>
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
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && <ArrowUpDown size={10} />}
                          </button>
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
                {table.getFilteredRowModel().rows.length} respons · Halaman{' '}
                {table.getState().pagination.pageIndex + 1} dari {Math.max(1, table.getPageCount())}
              </span>
              <div className="actions">
                <Button
                  variant="ghost"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="ghost"
                  disabled={!table.getCanNextPage()}
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
        Skor dihitung dari pilihan jawaban yang tervalidasi. Jawaban kosong ditampilkan sebagai “—”, bukan
        skor 1.
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
