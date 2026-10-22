'use client';
import { useState } from 'react';
import { Copy, Link2, Loader2, RefreshCw, UserMinus, UserPlus } from 'lucide-react';
import type { WorkspaceInvitation, WorkspaceMember } from '@/lib/workspace-types';
import { Badge, Button, Modal } from './ui';

export function WorkspaceTeamPanel({
  initialMembers,
  initialInvitation,
}: Readonly<{ initialMembers: WorkspaceMember[]; initialInvitation: WorkspaceInvitation | null }>) {
  const [members, setMembers] = useState(initialMembers);
  const [invitation, setInvitation] = useState(initialInvitation);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<WorkspaceMember | null>(null);
  async function request(path: string, method: string, body?: unknown) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Belum berhasil. Coba lagi.');
      if ('invitation' in data) setInvitation(data.invitation);
      if ('members' in data) setMembers(data.members);
      setSelected(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(invitation!.url);
      setNotice('Link tersalin. Kirim ke rekan Pengelola yang ingin diundang.');
    } catch {
      setError('Pilih dan salin teks link di bawah.');
    }
  }
  return (
    <section className="card workspace-team-panel" aria-labelledby="workspace-team-title">
      <div className="workspace-team-heading">
        <div>
          <h2 id="workspace-team-title">Pengelola workspace</h2>
          <p>Undang rekan untuk membuat survei, mengelola jawaban, dan menyusun presentasi bersama.</p>
        </div>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => void request('/api/workspace/team', 'GET')}
          aria-label="Perbarui anggota"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      <div className="workspace-team-invite">
        {invitation ? (
          <>
            <label className="field">
              Link undangan
              <input
                className="input"
                readOnly
                value={invitation.url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <p className="hint">
              Berlaku sampai{' '}
              {new Date(invitation.expiresAt).toLocaleDateString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              . Pemilik link yang masuk sebagai Pengelola dapat bergabung.
            </p>
            <div className="actions">
              <Button variant="secondary" onClick={() => void copy()} disabled={pending}>
                <Copy size={15} />
                Salin link
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => void request('/api/workspace/invitation', 'DELETE')}
              >
                Matikan link
              </Button>
            </div>
            <p className="hint">Mematikan link tidak mengeluarkan anggota yang sudah bergabung.</p>
          </>
        ) : (
          <Button disabled={pending} onClick={() => void request('/api/workspace/invitation', 'POST', {})}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}Buat link undangan
          </Button>
        )}
      </div>
      {notice && (
        <p className="banner" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      <div className="workspace-team-members">
        {members.length ? (
          members.map((member) => (
            <div className="workspace-team-member" key={member.userId}>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              <Badge tone={member.active ? 'green' : 'neutral'}>
                {member.active ? 'Pengelola' : 'Akses dicabut'}
              </Badge>
              <Button variant="secondary" disabled={pending} onClick={() => setSelected(member)}>
                {member.active ? <UserMinus size={15} /> : <UserPlus size={15} />}
                {member.active ? 'Cabut akses' : 'Aktifkan'}
              </Button>
            </div>
          ))
        ) : (
          <p className="hint">Belum ada rekan Pengelola. Anda tetap pemilik workspace ini.</p>
        )}
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!pending && !open) setSelected(null);
        }}
        title={selected?.active ? 'Cabut akses workspace?' : 'Aktifkan kembali anggota?'}
        description={selected?.name}
      >
        {error && (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        )}
        <p>
          {selected?.active
            ? 'Anggota ini tidak dapat membuka workspace lagi. Survei dan jawaban yang sudah dibuat tetap tersimpan.'
            : 'Anggota kembali dapat mengelola seluruh survei dan data dalam workspace ini.'}
        </p>
        <div className="modal-footer">
          <Button variant="secondary" disabled={pending} onClick={() => setSelected(null)}>
            Batal
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              selected &&
              void request('/api/workspace/team', 'PATCH', {
                userId: selected.userId,
                active: !selected.active,
              })
            }
          >
            {pending && <Loader2 size={15} className="animate-spin" />}Ya, lanjutkan
          </Button>
        </div>
      </Modal>
    </section>
  );
}
