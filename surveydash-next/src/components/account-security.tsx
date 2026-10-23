'use client';
import { useState } from 'react';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import { Button } from './ui';
import { DataRequestPanel } from './data-request-panel';
export function AccountSecurity({
  email,
  verified,
  enabled,
  emailAvailable,
}: {
  email: string;
  verified: boolean;
  enabled: boolean;
  emailAvailable: boolean;
}) {
  const [active, setActive] = useState(enabled),
    [password, setPassword] = useState(''),
    [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; codes: string[]; qr: string } | null>(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  return (
    <section className="card" style={{ padding: 24, marginBlock: 24 }}>
      <h2>Keamanan akun</h2>
      <p>Email: {verified ? 'Sudah diverifikasi' : 'Belum diverifikasi'}.</p>
      {!verified && (
        <Button
          variant="secondary"
          disabled={pending || !emailAvailable}
          onClick={async () => {
            setPending(true);
            setMessage('');
            try {
              const result = await authClient.sendVerificationEmail({
                email,
                callbackURL: '/studio/settings/account',
              });
              if (result.error) throw new Error(result.error.message);
              setMessage('Link verifikasi dikirim. Periksa email Anda.');
            } catch (failure) {
              setMessage(failure instanceof Error ? failure.message : 'Email belum dapat dikirim.');
            } finally {
              setPending(false);
            }
          }}
        >
          Kirim verifikasi email
        </Button>
      )}
      {!emailAvailable && !verified && (
        <p className="hint">Pengiriman email menunggu konfigurasi SMTP operator.</p>
      )}
      <h3 style={{ marginTop: 24 }}>Verifikasi dua langkah</h3>
      <p>
        {active
          ? 'Aktif. Login meminta kode dari aplikasi authenticator.'
          : 'Tambahkan kode dari aplikasi authenticator setelah kata sandi, terutama untuk admin dan pemilik workspace.'}
      </p>
      {!setup && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setMessage('');
            try {
              if (active) {
                if (!window.confirm('Nonaktifkan verifikasi dua langkah akun ini?')) return;
                const result = await authClient.twoFactor.disable({ password });
                if (result.error) throw new Error(result.error.message);
                setActive(false);
                setMessage('Verifikasi dua langkah dinonaktifkan.');
              } else {
                const result = await authClient.twoFactor.enable({
                  password,
                  issuer: 'SurveyDash Studio',
                  method: 'totp',
                });
                if (result.error) throw new Error(result.error.message);
                const data = result.data;
                if (!data || data.method !== 'totp')
                  throw new Error('Pengaturan authenticator belum tersedia.');
                const qr = await (await import('qrcode')).toDataURL(data.totpURI, { width: 224, margin: 2 });
                setSetup({
                  secret: new URL(data.totpURI).searchParams.get('secret') ?? '',
                  codes: data.backupCodes,
                  qr,
                });
              }
              setPassword('');
            } catch (failure) {
              setMessage(failure instanceof Error ? failure.message : 'Pengaturan belum berhasil.');
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            Kata sandi saat ini
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={pending}>
            {active ? 'Nonaktifkan dua langkah' : 'Siapkan authenticator'}
          </Button>
        </form>
      )}
      {setup && (
        <div>
          <p>1. Pindai QR dengan aplikasi authenticator, atau masukkan kunci secara manual.</p>
          <Image
            src={setup.qr}
            width={224}
            height={224}
            alt="QR pengaturan authenticator akun Anda"
            unoptimized
          />
          <p>
            <code style={{ overflowWrap: 'anywhere' }}>{setup.secret}</code>
          </p>
          <p>2. Simpan kode cadangan berikut di tempat pribadi. Jangan bagikan QR, kunci, atau kode ini.</p>
          <pre style={{ whiteSpace: 'pre-wrap', userSelect: 'all' }}>{setup.codes.join('\n')}</pre>
          <p>3. Masukkan kode 6 angka untuk menyelesaikan aktivasi.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setMessage('');
              try {
                const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
                if (result.error) throw new Error(result.error.message);
                setSetup(null);
                setCode('');
                setActive(true);
                setMessage('Verifikasi dua langkah aktif. Simpan kode cadangan Anda.');
              } catch (failure) {
                setMessage(failure instanceof Error ? failure.message : 'Kode belum cocok.');
              } finally {
                setPending(false);
              }
            }}
          >
            <label className="field">
              Kode authenticator
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={pending}>
              Aktifkan
            </Button>
          </form>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <DataRequestPanel />
    </section>
  );
}
