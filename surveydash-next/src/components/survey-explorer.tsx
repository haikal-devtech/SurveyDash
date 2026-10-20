'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  RotateCcw,
  ExternalLink,
  List,
  Grid2X2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Survey } from '@/lib/types';
import { Badge, Button, EmptyState, Modal } from './ui';
const date = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    : '—';
export function SurveyExplorer({
  initialSurveys,
  initialQuery = '',
  compact = false,
}: {
  initialSurveys: Survey[];
  initialQuery?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [surveys, setSurveys] = useState(initialSurveys);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('opened');
  const [grid, setGrid] = useState(false);
  const [page, setPage] = useState(0);
  const [menu, setMenu] = useState<Survey | null>(null);
  const [confirm, setConfirm] = useState<'archive' | 'trash' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const filtered = surveys
    .filter((s) => {
      const included =
        filter === 'trash'
          ? !!s.deletedAt
          : filter === 'archived'
            ? !!s.archivedAt && !s.deletedAt
            : !s.archivedAt && !s.deletedAt && (filter === 'all' || s.status === filter);
      return included && `${s.title} ${s.institution}`.toLowerCase().includes(query.trim().toLowerCase());
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title, 'id')
        : sort === 'responses'
          ? (b.responseCount ?? 0) - (a.responseCount ?? 0)
          : String(sort === 'created' ? b.createdAt : (b.lastOpenedAt ?? b.updatedAt)).localeCompare(
              String(sort === 'created' ? a.createdAt : (a.lastOpenedAt ?? a.updatedAt)),
            ),
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / (compact ? 8 : 20)));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * (compact ? 8 : 20), (currentPage + 1) * (compact ? 8 : 20));
  async function action(type: 'duplicate' | 'archive' | 'unarchive' | 'trash' | 'restore') {
    if (!menu) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/surveys/${menu.id}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSurveys((rows) => [data, ...rows.filter((row) => row.id !== data.id)]);
      setMenu(null);
      setConfirm(null);
      setNotice(
        type === 'duplicate'
          ? 'Salinan survei dibuat tanpa jawaban responden.'
          : 'Perubahan survei tersimpan.',
      );
      if (type === 'duplicate') router.push(`/studio/${data.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal mengelola survei.');
    } finally {
      setPending(false);
    }
  }
  const status = (survey: Survey) => (
    <Badge
      tone={
        survey.deletedAt || survey.archivedAt
          ? 'neutral'
          : survey.status === 'open'
            ? 'green'
            : survey.status === 'draft'
              ? 'purple'
              : 'neutral'
      }
    >
      {survey.deletedAt
        ? 'Di sampah'
        : survey.archivedAt
          ? 'Diarsipkan'
          : survey.status === 'open'
            ? 'Aktif'
            : survey.status === 'draft'
              ? 'Draft'
              : 'Ditutup'}
    </Badge>
  );
  const menuButton = (survey: Survey) => (
    <Button
      variant="ghost"
      aria-label={`Tindakan ${survey.title}`}
      onClick={() => {
        setMenu(survey);
        setError('');
      }}
    >
      <MoreHorizontal size={17} />
    </Button>
  );
  return (
    <section id="surveys" className="survey-explorer">
      <div className="explorer-heading">
        <h2>{compact ? 'Survei terbaru' : 'Semua survei'}</h2>
        <div className="actions">
          <select
            className="input explorer-sort"
            aria-label="Urutkan survei"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="opened">Terakhir dibuka</option>
            <option value="created">Tanggal dibuat</option>
            <option value="name">Nama survei</option>
            <option value="responses">Jumlah respons</option>
          </select>
          <Button
            variant="secondary"
            aria-label={grid ? 'Tampilan tabel' : 'Tampilan kartu'}
            onClick={() => setGrid((value) => !value)}
          >
            {grid ? <List size={17} /> : <Grid2X2 size={17} />}
          </Button>
        </div>
      </div>
      <div className="explorer-toolbar">
        <nav className="tabs-filter" aria-label="Filter survei">
          {[
            ['all', 'Semua'],
            ['open', 'Aktif'],
            ['draft', 'Draft'],
            ['closed', 'Ditutup'],
            ['archived', 'Diarsipkan'],
            ...(!compact ? [['trash', 'Sampah']] : []),
          ].map(([id, label]) => (
            <button
              type="button"
              className={filter === id ? 'active' : ''}
              aria-pressed={filter === id}
              key={id}
              onClick={() => {
                setFilter(id);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="search-input">
          <Search size={15} />
          <input
            className="input"
            aria-label="Cari survei"
            placeholder="Cari survei…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>
      {notice && (
        <p className="banner" role="status">
          {notice}
        </p>
      )}
      {visible.length ? (
        grid ? (
          <div className="survey-grid">
            {visible.map((survey) => (
              <article className="survey-card" key={survey.id}>
                <div className="survey-card-top">
                  <FileText size={21} />
                  {status(survey)}
                  {menuButton(survey)}
                </div>
                <Link href={`/studio/${survey.id}`}>
                  <h3>{survey.title}</h3>
                  <p className="institution">{survey.institution || 'Instansi belum diatur'}</p>
                </Link>
                <p className="hint">
                  {survey.responseCount ?? 0} respons · {survey.questions.length} pertanyaan
                  {survey.demo ? ' · Data simulasi' : ''}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="survey-file-table">
            <table role="table" aria-label="Survei Anda">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" scope="col">
                    Nama survei
                  </th>
                  <th role="columnheader" scope="col">
                    Status
                  </th>
                  <th role="columnheader" scope="col">
                    Respons
                  </th>
                  <th role="columnheader" scope="col">
                    Dibuat
                  </th>
                  <th role="columnheader" scope="col">
                    Terakhir dibuka
                  </th>
                  <th role="columnheader" scope="col" aria-label="Tindakan" />
                </tr>
              </thead>
              <tbody role="rowgroup">
                {visible.map((survey) => (
                  <tr key={survey.id} role="row">
                    <td role="cell" className="survey-file-title">
                      <Link href={`/studio/${survey.id}`} className="survey-file-name">
                        <span className="file-icon">
                          <FileText size={21} />
                        </span>
                        <span>
                          <strong>{survey.title}</strong>
                          <small>
                            {survey.institution || 'Instansi belum diatur'}
                            {survey.demo ? ' · Data simulasi' : ''}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td role="cell" className="survey-file-status">
                      {status(survey)}
                    </td>
                    <td role="cell" className="survey-file-responses">
                      {survey.responseCount ?? 0}
                      <span className="survey-file-mobile-label" aria-hidden="true">
                        {' '}
                        respons
                      </span>
                    </td>
                    <td role="cell" className="survey-file-date">
                      <span className="survey-file-mobile-label" aria-hidden="true">
                        Dibuat
                      </span>
                      {date(survey.createdAt)}
                    </td>
                    <td role="cell" className="survey-file-date">
                      <span className="survey-file-mobile-label" aria-hidden="true">
                        Terakhir dibuka
                      </span>
                      {date(survey.lastOpenedAt)}
                    </td>
                    <td role="cell" className="survey-file-actions">
                      {menuButton(survey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card">
          <EmptyState
            icon={<FileText size={25} />}
            title={
              query
                ? 'Survei tidak ditemukan.'
                : filter === 'trash'
                  ? 'Sampah masih kosong.'
                  : 'Belum ada survei di sini.'
            }
            description="Mulai dari template atau buat survei pertama Anda."
          />
        </div>
      )}
      {pageCount > 1 && (
        <div className="explorer-pagination">
          <span>
            {filtered.length} survei · Halaman {currentPage + 1} / {pageCount}
          </span>
          <div className="actions">
            <Button
              variant="secondary"
              aria-label="Halaman sebelumnya"
              disabled={!currentPage}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              aria-label="Halaman berikutnya"
              disabled={currentPage + 1 >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
      {menu && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) {
              setMenu(null);
              setConfirm(null);
            }
          }}
          title={
            confirm ? (confirm === 'trash' ? 'Pindahkan ke sampah?' : 'Arsipkan survei?') : 'Kelola survei'
          }
          description={menu.title}
        >
          {error && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}
          {confirm ? (
            <>
              <p className="template-safe-note">
                Form akan ditutup. Pertanyaan dan jawaban tetap tersimpan, dan survei dapat dipulihkan dari{' '}
                {confirm === 'trash' ? 'Sampah' : 'Diarsipkan'}.
              </p>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Batal
                </Button>
                <Button disabled={pending} variant="danger" onClick={() => void action(confirm)}>
                  {confirm === 'trash' ? 'Pindahkan ke sampah' : 'Arsipkan survei'}
                </Button>
              </div>
            </>
          ) : (
            <div className="survey-action-list">
              <Link className="btn btn-secondary" href={`/studio/${menu.id}`}>
                <ExternalLink size={15} />
                Buka survei
              </Link>
              <Button variant="secondary" disabled={pending} onClick={() => void action('duplicate')}>
                <Copy size={15} />
                Duplikat survei
              </Button>
              {menu.deletedAt ? (
                <Button variant="secondary" disabled={pending} onClick={() => void action('restore')}>
                  <RotateCcw size={15} />
                  Pulihkan survei
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => (menu.archivedAt ? void action('unarchive') : setConfirm('archive'))}
                  >
                    <Archive size={15} />
                    {menu.archivedAt ? 'Keluarkan dari arsip' : 'Arsipkan survei'}
                  </Button>
                  <Button variant="danger" onClick={() => setConfirm('trash')}>
                    <Trash2 size={15} />
                    Pindahkan ke sampah
                  </Button>
                </>
              )}
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
