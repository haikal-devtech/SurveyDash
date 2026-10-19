'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, RefreshCw, UserPlus, UsersRound } from 'lucide-react';
import { Badge, Button, EmptyState } from './ui';
import { SurveyorShareLink } from './surveyor-portal';
import type { ManagedSurveyorAssignment } from '@/lib/surveyor-types';
import '@/app/manager-surveyors.css';

interface Invitation {
  url: string;
  expiresAt: string;
}

export function SurveyorAssignments({
  surveyId,
  initialAssignments,
}: {
  surveyId: string;
  initialAssignments?: ManagedSurveyorAssignment[];
}) {
  const endpoint = `/api/surveys/${encodeURIComponent(surveyId)}/surveyors`;
  const invitationEndpoint = `/api/surveys/${encodeURIComponent(surveyId)}/surveyor-invitation`;
  const [assignmentData, setAssignmentData] = useState<{
    endpoint: string;
    assignments: ManagedSurveyorAssignment[];
  } | null>(initialAssignments ? { endpoint, assignments: initialAssignments } : null);
  const [invitationData, setInvitationData] = useState<{
    endpoint: string;
    invitation: Invitation | null;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [invitationPending, setInvitationPending] = useState(false);
  const [error, setError] = useState('');
  const [invitationError, setInvitationError] = useState('');
  const [message, setMessage] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const assignments = assignmentData?.endpoint === endpoint ? assignmentData.assignments : null;
  const invitation = invitationData?.endpoint === invitationEndpoint ? invitationData.invitation : null;
  const invitationLoaded = invitationData?.endpoint === invitationEndpoint;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Surveyor belum berhasil dimuat.');
        if (!controller.signal.aborted) {
          setAssignmentData({ endpoint, assignments: data.assignments });
          setError('');
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(invitationEndpoint, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Link undangan belum berhasil dimuat.');
        if (!controller.signal.aborted) {
          setInvitationData({ endpoint: invitationEndpoint, invitation: data.invitation });
          setInvitationError('');
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setInvitationError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
      }
    }
    void load();
    return () => controller.abort();
  }, [invitationEndpoint, attempt]);

  async function updateInvitation(method: 'POST' | 'DELETE') {
    setInvitationPending(true);
    setInvitationError('');
    setCopiedUrl('');
    try {
      const response = await fetch(invitationEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Link undangan belum berhasil diperbarui.');
      setInvitationData({ endpoint: invitationEndpoint, invitation: data.invitation });
      setMessage(method === 'POST' ? 'Link undangan siap dibagikan.' : 'Link undangan dimatikan.');
    } catch (failure) {
      setInvitationError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setInvitationPending(false);
    }
  }

  async function copyInvitation() {
    if (!invitation) return;
    setInvitationError('');
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopiedUrl(invitation.url);
    } catch {
      setInvitationError('Pilih teks link untuk menyalinnya secara manual.');
    }
  }

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
      if (Array.isArray(data.assignments)) setAssignmentData({ endpoint, assignments: data.assignments });
      if (method === 'POST') setUsername('');
      setMessage(
        method === 'POST'
          ? 'Surveyor ditambahkan.'
          : body.active
            ? 'Penugasan diaktifkan.'
            : 'Penugasan dinonaktifkan.',
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
        <h2>Surveyor</h2>
        <Button
          variant="ghost"
          disabled={!!pending || invitationPending}
          onClick={() => setAttempt((value) => value + 1)}
          aria-label="Perbarui daftar surveyor"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      <section className="card manager-invitation" aria-labelledby="manager-invitation-title">
        <span className="manager-invitation-icon">
          <UserPlus size={22} />
        </span>
        <div className="manager-invitation-content">
          <h3 id="manager-invitation-title">Undang Surveyor</h3>
          <p>Berlaku 7 hari. Penerima link dapat bergabung sebagai Surveyor.</p>
          {invitation ? (
            <>
              <input
                className="input"
                aria-label="Link undangan untuk bergabung sebagai surveyor"
                readOnly
                value={invitation.url}
                onFocus={(event) => event.currentTarget.select()}
              />
              <div className="manager-invitation-actions">
                <Button data-tour="manager-invitation" onClick={copyInvitation} disabled={invitationPending}>
                  {copiedUrl === invitation.url ? <Check size={16} /> : <Copy size={16} />}
                  {copiedUrl === invitation.url ? 'Link undangan tersalin' : 'Salin link undangan'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={invitationPending}
                  onClick={() => void updateInvitation('DELETE')}
                >
                  {invitationPending ? <Loader2 size={15} className="animate-spin" /> : null}Matikan link
                </Button>
              </div>
              <small>
                Berlaku hingga{' '}
                {new Date(invitation.expiresAt).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Jakarta',
                })}
                .
              </small>
            </>
          ) : (
            <Button
              data-tour="manager-invitation"
              onClick={() => void updateInvitation('POST')}
              disabled={invitationPending || (!invitationLoaded && !invitationError)}
            >
              {invitationPending || (!invitationLoaded && !invitationError) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              Undang Surveyor
            </Button>
          )}
          {invitationError && (
            <p className="surveyor-error" role="alert">
              {invitationError}
            </p>
          )}
          {copiedUrl && copiedUrl === invitation?.url && (
            <p className="manager-invitation-copied" role="status">
              Kirim link ini lewat WhatsApp atau pesan pribadi.
            </p>
          )}
        </div>
      </section>
      <details className="manager-username-details">
        <summary>Tambahkan dengan username</summary>
        <form
          className="surveyor-assign-form"
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
            />
            <p className="hint">Untuk akun yang sudah terdaftar.</p>
          </div>
          <Button type="submit" disabled={!!pending || !username.trim()}>
            {pending === 'create' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Tambahkan
          </Button>
        </form>
      </details>
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
          Memuat surveyor…
        </div>
      ) : assignments?.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<UsersRound size={25} />}
            title="Belum ada surveyor"
            description="Bagikan link undangan di atas."
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
              <p className="hint">{assignment.responseCount.toLocaleString('id-ID')} respons</p>
              <p className="manager-respondent-link-label">
                <Link2 size={14} />
                Link responden
              </p>
              <SurveyorShareLink
                key={assignment.shareUrl}
                shareUrl={assignment.shareUrl}
                disabled={!assignment.active}
              />
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
                {assignment.active ? 'Nonaktifkan surveyor' : 'Aktifkan kembali'}
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
