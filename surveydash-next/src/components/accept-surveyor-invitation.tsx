'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';

export function AcceptSurveyorInvitation({ token, switchAccount = false }: { token: string; switchAccount?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function proceed() {
    setPending(true);
    setError('');
    try {
      if (switchAccount) {
        const result = await authClient.signOut();
        if (result.error) throw new Error('Belum bisa mengganti akun. Coba lagi.');
        router.replace('/login?role=surveyor&invite=' + encodeURIComponent(token));
      } else {
        const response = await fetch('/api/surveyor/invitations/' + encodeURIComponent(token) + '/accept', { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Belum bisa bergabung. Coba lagi.');
        router.replace('/surveyor');
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
      {error && <p className="banner banner-error" role="alert">{error}</p>}
      <Button disabled={pending} onClick={() => void proceed()}>
        {pending && <Loader2 className="animate-spin" size={17} />}
        {switchAccount ? 'Ganti akun' : 'Bergabung'}
      </Button>
    </div>
  );
}
