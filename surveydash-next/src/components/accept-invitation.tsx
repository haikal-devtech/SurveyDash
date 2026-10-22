'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
export function AcceptInvitation({
  token,
  kind,
  switchAccount = false,
}: Readonly<{ token: string; kind: 'surveyor' | 'workspace'; switchAccount?: boolean }>) {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  async function proceed() {
    setPending(true);
    setError('');
    try {
      if (switchAccount) {
        const result = await authClient.signOut();
        if (result.error) throw new Error('Belum bisa mengganti akun. Coba lagi.');
        const query = new URLSearchParams(
          kind === 'workspace'
            ? { role: 'manager', workspaceInvite: token }
            : { role: 'surveyor', invite: token },
        );
        router.replace('/login?' + query.toString());
      } else {
        const response = await fetch(`/api/${kind}/invitations/${encodeURIComponent(token)}/accept`, {
          method: 'POST',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Belum bisa bergabung. Coba lagi.');
        router.replace(kind === 'workspace' ? '/studio' : '/surveyor');
      }
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="invite-action">
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending} onClick={() => void proceed()}>
        {pending && <Loader2 className="animate-spin" size={17} />}
        {switchAccount ? 'Ganti akun' : 'Bergabung'}
      </Button>
    </div>
  );
}
