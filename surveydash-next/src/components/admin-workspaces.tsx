'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { RegisteredSurveyor } from '@/lib/admin-surveyors';
import { Button, Badge } from './ui';
const AdminSurveyors = dynamic(() => import('./admin-surveyors').then((module) => module.AdminSurveyors), {
  loading: () => <p className="assignment-map-loading">Memuat peta surveyor…</p>,
});
export function AdminWorkspaces({
  rows,
  currentOwnerId,
  surveyors = [],
  initialView = 'workspaces',
}: {
  rows: { id: string; name: string; email: string; isAdmin: boolean; workspaceName: string }[];
  currentOwnerId: string;
  surveyors?: RegisteredSurveyor[];
  initialView?: 'workspaces' | 'surveyors';
}) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  async function select(ownerId: string) {
    setPending(ownerId);
    setError('');
    try {
      const response = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      router.push('/studio');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal memilih workspace.');
      setPending('');
    }
  }
  const filtered = rows.filter((row) =>
    `${row.name} ${row.email} ${row.workspaceName}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Admin workspace.</h1>
          <p>
            Pilih workspace untuk mengelola form, data, template, dan presentasinya. Akun login Anda tetap
            sama.
          </p>
        </div>
        <Badge tone="purple">Admin platform</Badge>
      </div>
      <div className="team-view-switch admin-view-switch" role="group" aria-label="Halaman admin">
        <Button variant="ghost" aria-pressed={view === 'workspaces'} onClick={() => setView('workspaces')}>
          Workspace
        </Button>
        <Button variant="ghost" aria-pressed={view === 'surveyors'} onClick={() => setView('surveyors')}>
          Peta surveyor
        </Button>
      </div>
      {view === 'surveyors' ? (
        <AdminSurveyors initialSurveyors={surveyors} />
      ) : (
        <>
          <label className="field">
            Cari akun atau workspace
            <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} />
          </label>
          {error && (
            <p className="banner banner-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-workspace-grid">
            {filtered.map((row) => (
              <article className="card admin-workspace-card" key={row.id}>
                <h2>{row.workspaceName}</h2>
                <p>{row.name}</p>
                <p className="hint">{row.email}</p>
                <div className="actions">
                  <Badge tone={row.isAdmin ? 'purple' : 'neutral'}>
                    {row.isAdmin ? 'Admin platform' : 'Pemilik workspace'}
                  </Badge>
                  {row.id === currentOwnerId && <Badge tone="green">Sedang dikelola</Badge>}
                </div>
                <Button disabled={!!pending} onClick={() => void select(row.id)}>
                  {pending === row.id ? 'Membuka…' : 'Kelola workspace'}
                </Button>
              </article>
            ))}
          </div>
          {!filtered.length && <p className="hint">Tidak ada akun yang cocok.</p>}
        </>
      )}
    </>
  );
}
export function ReturnWorkspace({ userId, isAdmin = true }: { userId: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function reset() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: userId }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      router.push('/studio');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal kembali.');
      setPending(false);
    }
  }
  return (
    <div className="admin-context">
      <span>{isAdmin ? 'Mode admin · Workspace akun lain' : 'Workspace bersama'}</span>
      <Button variant="secondary" disabled={pending} onClick={() => void reset()}>
        Kembali ke workspace saya
      </Button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
