'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDeferredValue, useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  UsersRound,
  UserCheck,
  UserMinus,
  Loader2,
  RefreshCw,
  MapPin,
  Map,
  List,
} from 'lucide-react';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import { matchesSurveyor, type SurveyorStatusFilter } from '@/lib/surveyor-search';
import { Badge, Button, EmptyState, Modal } from './ui';
import { SurveyorAssignments } from './surveyor-assignments';
import { AssignmentProvinceDialog } from './assignment-province-dialog';
import { provinces, provinceName, isProvinceId } from '@/lib/provinces';
import '@/app/manager-surveyors.css';
const AssignmentMap = dynamic(() => import('./assignment-map').then((module) => module.AssignmentMap), {
  loading: () => (
    <p className="assignment-map-loading" role="status">
      Memuat peta wilayah…
    </p>
  ),
});
interface SurveyGroup {
  surveyId: string;
  title: string;
  assignments: ManagedSurveyorAssignment[];
}
type TeamRow = { surveyId: string; title: string; assignment: ManagedSurveyorAssignment };
function matchingRows(rows: TeamRow[], surveyId: string, query: string, status: SurveyorStatusFilter) {
  return rows.filter(
    (row) =>
      (surveyId === 'all' || row.surveyId === surveyId) &&
      matchesSurveyor(
        row.assignment,
        query,
        status,
        row.title + ' ' + provinceName(row.assignment.provinceId),
      ),
  );
}
function matchesProvince(row: TeamRow, provinceId: string) {
  if (provinceId === 'all') return true;
  if (provinceId === 'unset') return !row.assignment.provinceId || !isProvinceId(row.assignment.provinceId);
  return row.assignment.provinceId === provinceId;
}
function rosterCaption(count: number, provinceId: string) {
  const caption = `${count} penugasan ditemukan`;
  if (provinceId === 'all') return caption;
  const label = provinceId === 'unset' ? 'Wilayah belum diatur' : provinceName(provinceId);
  return `${caption} · ${label}`;
}
function RosterEmptyState({ hasRows, provinceId }: Readonly<{ hasRows: boolean; provinceId: string }>) {
  let title = 'Tim survei masih kosong';
  let description = 'Undang surveyor untuk mulai membagikan survei.';
  if (hasRows) {
    title = provinceId === 'all' ? 'Surveyor tidak ditemukan' : 'Belum ada penugasan di wilayah ini';
    description = 'Coba nama lain atau ubah filternya.';
  }
  return <EmptyState icon={<Search size={25} />} title={title} description={description} />;
}
export function ManagerSurveyors({
  surveys,
  initialSurveyId,
  initialView = 'list',
}: Readonly<{
  surveys: SurveyGroup[];
  initialSurveyId?: string;
  initialView?: 'list' | 'map';
}>) {
  const [groups, setGroups] = useState(surveys);
  const requested = surveys.find((survey) => survey.surveyId === initialSurveyId)?.surveyId;
  const [surveyFilter, setSurveyFilter] = useState(requested ?? 'all');
  const [inviteId, setInviteId] = useState(requested ?? surveys[0]?.surveyId ?? '');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const [status, setStatus] = useState<SurveyorStatusFilter>(initialView === 'map' ? 'active' : 'all');
  const [view, setView] = useState(initialView);
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [regionTarget, setRegionTarget] = useState<{
    surveyId: string;
    assignment: ManagedSurveyorAssignment;
  } | null>(null);
  const [selected, setSelected] = useState<{
    surveyId: string;
    title: string;
    assignment: ManagedSurveyorAssignment;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = groups.flatMap((group) =>
    group.assignments.map((assignment) => ({ surveyId: group.surveyId, title: group.title, assignment })),
  );
  const matching = matchingRows(rows, surveyFilter, search, status);
  const visible = matching.filter((row) => matchesProvince(row, provinceFilter));
  const people = new Set(rows.map((row) => row.assignment.username)).size;
  async function refreshTeam() {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/workspace/surveyors', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? 'Tim belum dapat dimuat.');
      setGroups(data.surveys);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Koneksi gagal.');
    } finally {
      setRefreshing(false);
    }
  }
  function update(surveyId: string, assignments: ManagedSurveyorAssignment[]) {
    setGroups((current) =>
      current.map((group) => (group.surveyId === surveyId ? { ...group, assignments } : group)),
    );
  }
  async function changeStatus() {
    if (!selected) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(selected.surveyId)}/surveyors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: selected.assignment.id, active: !selected.assignment.active }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? 'Status belum berhasil diubah.');
      update(selected.surveyId, data.assignments);
      setNotice(
        `Tugas @${selected.assignment.username} ${selected.assignment.active ? 'dinonaktifkan' : 'diaktifkan'}.`,
      );
      setSelected(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Koneksi gagal.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="team-directory">
      <div className="page-heading" data-motion-enter="">
        <div>
          <h1>Surveyor</h1>
          <p>Cari anggota tim dan atur penugasannya.</p>
        </div>
        <div className="actions">
          <div className="team-view-switch" role="group" aria-label="Tampilan tim">
            <Button variant="ghost" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List size={16} />
              Daftar
            </Button>
            <Button
              variant="ghost"
              aria-pressed={view === 'map'}
              onClick={() => {
                setView('map');
                setStatus('active');
              }}
            >
              <Map size={16} />
              Peta
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => void refreshTeam()}
            disabled={pending || refreshing}
            aria-label="Perbarui tim surveyor"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          <Button
            disabled={!groups.length}
            onClick={() => setInviteOpen(!inviteOpen)}
            aria-expanded={inviteOpen}
          >
            <Plus size={17} />
            Undang surveyor
          </Button>
        </div>
      </div>
      {!groups.length ? (
        <section className="card">
          <EmptyState
            icon={<UsersRound size={26} />}
            title="Buat survei terlebih dahulu"
            description="Setelah itu, undang surveyor untuk membantu membagikannya."
          >
            <Link href="/studio/surveys" className="btn btn-primary">
              <Plus size={16} />
              Buat survei
            </Link>
          </EmptyState>
        </section>
      ) : (
        <>
          {error && !selected && (
            <div className="banner banner-error" role="alert">
              {error}
            </div>
          )}
          {view === 'list' && (
            <div className="team-summary">
              {[
                { label: 'Anggota tim', value: people, Icon: UsersRound },
                {
                  label: 'Tugas aktif',
                  value: rows.filter((r) => r.assignment.active).length,
                  Icon: UserCheck,
                },
                {
                  label: 'Tugas nonaktif',
                  value: rows.filter((r) => !r.assignment.active).length,
                  Icon: UserMinus,
                },
              ].map(({ label, value, Icon }) => (
                <section className="card" key={label} data-motion-enter="">
                  <Icon size={19} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </section>
              ))}
            </div>
          )}
          {inviteOpen && (
            <section className="team-invite-panel">
              <div className="card manager-surveyor-picker">
                <label className="field">
                  Pilih survei
                  <select className="input" value={inviteId} onChange={(e) => setInviteId(e.target.value)}>
                    {groups.map((group) => (
                      <option key={group.surveyId} value={group.surveyId}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Link className="btn btn-secondary" href={`/studio/${inviteId}`}>
                  Buka survei
                  <ArrowUpRight size={15} />
                </Link>
              </div>
              <SurveyorAssignments
                key={inviteId}
                surveyId={inviteId}
                assignments={groups.find((g) => g.surveyId === inviteId)?.assignments}
                onAssignmentsChange={(assignments) => update(inviteId, assignments)}
              />
            </section>
          )}
          {notice && (
            <div className="banner" role="status">
              {notice}
            </div>
          )}
          <section className="card team-roster" data-motion-enter="">
            <div className="team-search-bar">
              <label className="team-search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama atau @username…"
                  aria-label="Cari surveyor berdasarkan nama atau username"
                  maxLength={200}
                />
              </label>
              <select
                className="input"
                aria-label="Filter status surveyor"
                value={status}
                onChange={(e) => setStatus(e.target.value as SurveyorStatusFilter)}
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <select
                className="input"
                aria-label="Filter survei penugasan"
                value={surveyFilter}
                onChange={(e) => setSurveyFilter(e.target.value)}
              >
                <option value="all">Semua survei</option>
                {groups.map((group) => (
                  <option key={group.surveyId} value={group.surveyId}>
                    {group.title}
                  </option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Filter wilayah tugas"
                value={provinceFilter}
                onChange={(event) => setProvinceFilter(event.target.value)}
              >
                <option value="all">Semua wilayah</option>
                <option value="unset">Belum diatur</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
            {view === 'map' && (
              <AssignmentMap
                assignments={matching.map((row) => row.assignment)}
                selected={provinceFilter}
                onSelect={setProvinceFilter}
              />
            )}
            <p className="team-result-count" role="status">
              {rosterCaption(visible.length, provinceFilter)}
            </p>
            {visible.length ? (
              <div className="team-table-scroll">
                <table className="team-table">
                  <thead>
                    <tr>
                      <th>Surveyor</th>
                      <th>Survei</th>
                      <th>Wilayah tugas</th>
                      <th>Respons</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Tindakan</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ surveyId, title, assignment }) => (
                      <tr key={assignment.id}>
                        <td>
                          <div className="team-member">
                            <span aria-hidden="true" className="team-avatar">
                              {assignment.fullName.slice(0, 1).toLocaleUpperCase('id')}
                            </span>
                            <span>
                              <strong>{assignment.fullName}</strong>
                              <small>@{assignment.username}</small>
                            </span>
                          </div>
                        </td>
                        <td data-label="Survei">
                          <Link href={`/studio/${surveyId}`}>
                            {title}
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                        <td data-label="Wilayah">
                          <Button
                            variant="ghost"
                            className="team-region-button"
                            onClick={() => setRegionTarget({ surveyId, assignment })}
                            aria-label={`Atur wilayah @${assignment.username} untuk ${title}`}
                          >
                            <MapPin size={15} />
                            <span>{provinceName(assignment.provinceId)}</span>
                            <small>Atur</small>
                          </Button>
                        </td>
                        <td data-label="Respons">{assignment.responseCount.toLocaleString('id-ID')}</td>
                        <td data-label="Status">
                          <Badge tone={assignment.active ? 'green' : 'neutral'}>
                            {assignment.active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSelected({ surveyId, title, assignment });
                              setError('');
                            }}
                          >
                            {assignment.active ? <UserMinus size={15} /> : <UserCheck size={15} />}{' '}
                            {assignment.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <RosterEmptyState hasRows={rows.length > 0} provinceId={provinceFilter} />
            )}
          </section>
        </>
      )}
      {regionTarget && (
        <AssignmentProvinceDialog
          key={regionTarget.assignment.id}
          surveyId={regionTarget.surveyId}
          assignment={regionTarget.assignment}
          onClose={() => setRegionTarget(null)}
          onSaved={(assignments) => {
            update(regionTarget.surveyId, assignments);
            setNotice(`Wilayah tugas @${regionTarget.assignment.username} diperbarui.`);
          }}
        />
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!pending && !open) setSelected(null);
        }}
        title={selected?.assignment.active ? 'Nonaktifkan penugasan?' : 'Aktifkan penugasan?'}
        description={selected ? `@${selected.assignment.username} · ${selected.title}` : undefined}
      >
        {selected && (
          <>
            <p className="team-status-description">
              {selected.assignment.active
                ? 'Link responden untuk tugas ini akan berhenti bekerja. Jawaban yang sudah masuk tetap tersimpan.'
                : 'Surveyor mendapat link responden baru untuk tugas ini.'}
            </p>
            {error && (
              <div role="alert" className="banner banner-error">
                {error}
              </div>
            )}
            <div className="modal-footer">
              <Button variant="secondary" disabled={pending} onClick={() => setSelected(null)}>
                Batal
              </Button>
              <Button disabled={pending} onClick={() => void changeStatus()}>
                {pending && <Loader2 size={16} className="animate-spin" />}
                {selected.assignment.active ? 'Nonaktifkan tugas' : 'Aktifkan tugas'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
