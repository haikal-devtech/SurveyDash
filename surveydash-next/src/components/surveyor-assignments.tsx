'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, UserPlus, UsersRound } from 'lucide-react';
import { Badge, Button, EmptyState } from './ui';
import { SurveyorShareLink } from './surveyor-portal';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';

export function SurveyorAssignments({ surveyId }: { surveyId: string }) {
  const [assignmentData, setAssignmentData] = useState<{
    endpoint: string;
    assignments: ManagedSurveyorAssignment[];
  } | null>(null);
  const [username, setUsername] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const endpoint = `/api/surveys/${encodeURIComponent(surveyId)}/surveyors`;
  const assignments = assignmentData?.endpoint === endpoint ? assignmentData.assignments : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Penugasan belum berhasil dimuat.');
        setAssignmentData({ endpoint, assignments: data.assignments });
        setError('');
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, attempt]);

  async function mutate(method: 'POST' | 'PATCH', body: Record<string, unknown>, key: string) {
    setPending(key);
    setError('');
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Penugasan belum berhasil disimpan.');
      if (method === 'POST') setUsername('');
      setMessage(
        method === 'POST'
          ? 'Surveyor berhasil ditugaskan. Link pribadi tersedia di portal surveyor.'
          : body.active
            ? 'Penugasan kembali aktif.'
            : 'Penugasan dinonaktifkan. Link ini tidak menerima respons baru.',
      );
      setAttempt((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="surveyor-manager-panel">
      <div className="surveyor-task-heading">
        <div>
          <h2>Penugasan surveyor</h2>
          <p>Surveyor dapat melihat pertanyaan dan membagikan link pribadi untuk survei ini.</p>
        </div>
        <Button
          variant="ghost"
          disabled={!!pending}
          onClick={() => setAttempt((value) => value + 1)}
          aria-label="Muat ulang penugasan surveyor"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      <form
        className="card surveyor-assign-form"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate('POST', { username: username.trim().toLowerCase().replace(/^@/, '') }, 'create');
        }}
      >
        <div className="field">
          <label htmlFor="assign-surveyor-username">Username surveyor</label>
          <input
            id="assign-surveyor-username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            required
            minLength={3}
            maxLength={31}
            placeholder="contoh: haikal_01"
            disabled={!!pending}
            aria-describedby="assign-surveyor-hint"
          />
          <p id="assign-surveyor-hint" className="hint">
            Surveyor harus sudah mendaftar dan melengkapi profilnya.
          </p>
        </div>
        <Button type="submit" disabled={!!pending || !username.trim()}>
          {pending === 'create' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Tugaskan surveyor
        </Button>
      </form>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
          <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>
            Coba lagi
          </Button>
        </div>
      )}
      {message && (
        <div className="banner" role="status">
          <Check size={16} />
          {message}
        </div>
      )}
      {!assignments && !error ? (
        <div className="surveyor-loading" role="status">
          <Loader2 size={20} className="animate-spin" />
          Memuat penugasan…
        </div>
      ) : assignments?.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<UsersRound size={25} />}
            title="Belum ada surveyor untuk survei ini"
            description="Tambahkan username surveyor untuk memberikan akses baca pertanyaan dan link responden yang tercatat atas penugasannya."
          />
        </section>
      ) : (
        <div className="surveyor-managed-list">
          {assignments?.map((assignment) => (
            <article className="card surveyor-managed-assignment" key={assignment.id}>
              <div className="surveyor-managed-identity">
                <div>
                  <h3>{assignment.fullName}</h3>
                  <p>@{assignment.username}</p>
                </div>
                <Badge tone={assignment.active ? 'green' : 'neutral'}>
                  {assignment.active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <p className="hint">
                {assignment.responseCount.toLocaleString('id-ID')} respons melalui link penugasan ini.
              </p>
              <SurveyorShareLink shareUrl={assignment.shareUrl} disabled={!assignment.active} />
              <Button
                variant={assignment.active ? 'ghost' : 'secondary'}
                disabled={!!pending}
                onClick={() =>
                  void mutate(
                    'PATCH',
                    { assignmentId: assignment.id, active: !assignment.active },
                    assignment.id,
                  )
                }
              >
                {pending === assignment.id && <Loader2 size={15} className="animate-spin" />}
                {assignment.active ? 'Nonaktifkan penugasan' : 'Aktifkan kembali'}
              </Button>
            </article>
          ))}
        </div>
      )}
      <p className="surveyor-manager-note">
        Menonaktifkan penugasan menghentikan penerimaan respons melalui link tersebut. Respons yang sudah
        terkumpul tetap tersimpan beserta identitas surveyornya.
      </p>
    </section>
  );
}
