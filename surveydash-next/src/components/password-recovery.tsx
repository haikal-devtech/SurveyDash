'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button } from './ui';

export function PasswordRecovery({
  mode,
  available,
  supportEmail,
  token,
  invalidToken = false,
}: {
  mode: 'request' | 'reset';
  available: boolean;
  supportEmail: string;
  token?: string;
  invalidToken?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const invalid = mode === 'reset' && (!token || invalidToken);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!available || invalid) return;
    if (mode === 'reset' && password !== confirmation) {
      setError('Konfirmasi kata sandi belum cocok.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const result =
        mode === 'request'
          ? await authClient.requestPasswordReset({
              email,
              redirectTo: window.location.origin + '/reset-password',
            })
          : await authClient.resetPassword({ newPassword: password, token: token! });
      if (result.error)
        throw new Error(
          result.error.code === 'INVALID_TOKEN'
            ? 'Link tidak valid atau sudah kedaluwarsa. Minta link baru.'
            : mode === 'request'
              ? 'Permintaan belum dapat diproses. Coba lagi nanti.'
              : 'Kata sandi belum dapat diubah. Periksa link dan coba lagi.',
        );
      setPassword('');
      setConfirmation('');
      setDone(true);
      if (mode === 'reset') window.history.replaceState(null, '', '/reset-password');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Permintaan gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="recovery-page">
      <Link href="/">
        <Brand />
      </Link>
      <section className="card recovery-card">
        <h1>{mode === 'request' ? 'Pulihkan akses akun.' : 'Buat kata sandi baru.'}</h1>
        {!available ? (
          <>
            <p>Pemulihan melalui email belum diaktifkan. Hubungi pengelola untuk bantuan akses akun.</p>
            <a className="text-link" href={'mailto:' + supportEmail}>
              {supportEmail}
            </a>
          </>
        ) : invalid && !done ? (
          <>
            <p role="alert">Link tidak valid atau sudah kedaluwarsa.</p>
            <Link className="btn btn-primary" href="/forgot-password">
              Minta link baru
            </Link>
          </>
        ) : done ? (
          <div role="status">
            <p>
              {mode === 'request'
                ? 'Jika email tersebut terdaftar, link pemulihan akan dikirim. Periksa inbox dan folder spam.'
                : 'Kata sandi berhasil diubah. Sesi sebelumnya telah diakhiri.'}
            </p>
            <Link className="btn btn-primary" href="/login">
              Kembali ke login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === 'request' ? (
              <div className="field">
                <label htmlFor="recovery-email">Alamat email</label>
                <input
                  id="recovery-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="new-password">Kata sandi baru</label>
                  <input
                    id="new-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <p className="hint">Minimal 10 karakter.</p>
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Konfirmasi kata sandi</label>
                  <input
                    id="confirm-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={128}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="banner banner-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" size={16} />}
              {pending
                ? 'Memproses…'
                : mode === 'request'
                  ? 'Kirim link pemulihan'
                  : 'Simpan kata sandi baru'}
            </Button>
          </form>
        )}
        <Link className="text-link" href="/login">
          Kembali ke login
        </Link>
      </section>
    </main>
  );
}
