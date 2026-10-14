'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge } from './ui';
export function AdminWorkspaces({
  rows,
  currentOwnerId,
}: {
  rows: { id: string; name: string; email: string; isAdmin: boolean; workspaceName: string }[];
  currentOwnerId: string;
}) {
  const router = useRouter();
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
  );
}
export function ReturnWorkspace({ userId }: { userId: string }) {
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
      <span>Mode admin · Workspace akun lain</span>
      <Button variant="secondary" disabled={pending} onClick={() => void reset()}>
        Kembali ke workspace saya
      </Button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
