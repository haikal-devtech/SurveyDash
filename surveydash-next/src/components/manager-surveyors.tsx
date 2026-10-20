'use client';
import Link from 'next/link';
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
} from 'lucide-react';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import { matchesSurveyor, type SurveyorStatusFilter } from '@/lib/surveyor-search';
import { Badge, Button, EmptyState, Modal } from './ui';
import { SurveyorAssignments } from './surveyor-assignments';
import '@/app/manager-surveyors.css';
interface SurveyGroup {
  surveyId: string;
  title: string;
  assignments: ManagedSurveyorAssignment[];
}
export function ManagerSurveyors({
  surveys,
  initialSurveyId,
}: {
  surveys: SurveyGroup[];
  initialSurveyId?: string;
}) {
  const [groups, setGroups] = useState(surveys);
  const [surveyFilter, setSurveyFilter] = useState(
    surveys.some((s) => s.surveyId === initialSurveyId) ? initialSurveyId! : 'all',
  );
  const [inviteId, setInviteId] = useState(initialSurveyId ?? surveys[0]?.surveyId ?? '');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const [status, setStatus] = useState<SurveyorStatusFilter>('all');
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
  const visible = rows.filter(
    (row) =>
      (surveyFilter === 'all' || row.surveyId === surveyFilter) &&
      matchesSurveyor(row.assignment, search, status, row.title),
  );
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
      <div className="page-heading">
        <div>
          <h1>Surveyor</h1>
          <p>Cari anggota tim dan atur penugasannya.</p>
        </div>
        <div className="actions">
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
              <section className="card" key={label}>
                <Icon size={19} />
                <span>{label}</span>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
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
          <section className="card team-roster">
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
            </div>
            <p className="team-result-count" role="status">
              {visible.length} penugasan ditemukan
            </p>
            {visible.length ? (
              <div className="team-table-scroll">
                <table className="team-table">
                  <thead>
                    <tr>
                      <th>Surveyor</th>
                      <th>Survei</th>
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
              <EmptyState
                icon={<Search size={25} />}
                title={rows.length ? 'Surveyor tidak ditemukan' : 'Tim survei masih kosong'}
                description={
                  rows.length
                    ? 'Coba nama lain atau ubah filternya.'
                    : 'Undang surveyor untuk mulai membagikan survei.'
                }
              />
            )}
          </section>
        </>
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
