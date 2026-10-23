'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
import { Brand } from './brand';
export function TwoFactorChallenge({ next }: { next?: string }) {
  const [code, setCode] = useState(''),
    [backup, setBackup] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <main className="recovery-page">
      <Brand />
      <section className="card recovery-card">
        <h1>Verifikasi login</h1>
        <p>
          {backup
            ? 'Masukkan satu kode cadangan yang belum dipakai.'
            : 'Masukkan kode dari aplikasi authenticator Anda.'}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError('');
            try {
              const result = backup
                ? await authClient.twoFactor.verifyBackupCode({ code })
                : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
              if (result.error)
                throw new Error(result.error.message ?? 'Kode tidak cocok atau sudah dipakai.');
              const response = await fetch('/api/account/context');
              const context = await response.json();
              if (!response.ok) throw new Error(context.error);
              const destination =
                next && /^\/invite\/(?:workspace|surveyor)\/[a-zA-Z0-9_-]{32}$/.test(next)
                  ? next
                  : context.role === 'surveyor'
                    ? '/surveyor'
                    : '/studio';
              setCode('');
              router.replace(destination);
              router.refresh();
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Verifikasi gagal.');
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            {backup ? 'Kode cadangan' : 'Kode authenticator'}
            <input
              autoComplete="one-time-code"
              inputMode={backup ? 'text' : 'numeric'}
              pattern={backup ? undefined : '[0-9]{6}'}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Memeriksa…' : 'Lanjutkan'}
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={() => {
            setBackup(!backup);
            setCode('');
            setError('');
          }}
        >
          {backup ? 'Gunakan authenticator' : 'Gunakan kode cadangan'}
        </Button>
      </section>
    </main>
  );
}
