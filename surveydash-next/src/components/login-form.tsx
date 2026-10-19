'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button } from './ui';
import '@/app/auth-entry.css';

type AccountRole = 'manager' | 'surveyor';

export function LoginForm({
  initialRegister = false,
  recoveryAvailable = false,
  supportEmail,
  role = 'manager',
  invitationToken,
}: {
  initialRegister?: boolean;
  recoveryAvailable?: boolean;
  supportEmail: string;
  role?: AccountRole;
  invitationToken?: string;
}) {
  const router = useRouter();
  const register = initialRegister;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const isSurveyor = role === 'surveyor';
  const surveyorRegistration = register && isSurveyor;
  const bankStep = surveyorRegistration && step === 2;

  function loginHref(nextRole: AccountRole, nextRegister: boolean) {
    const query = new URLSearchParams({ role: nextRole });
    if (nextRegister) query.set('mode', 'signup');
    if (invitationToken) query.set('invite', invitationToken);
    return '/login?' + query.toString();
  }
  function changeStep(next: 1 | 2) {
    setStep(next);
    setError('');
    requestAnimationFrame(() => stepTitle.current?.focus());
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (surveyorRegistration && !bankStep) {
      if (name.trim().length < 2) {
        setError('Isi nama lengkap Anda.');
        return;
      }
      changeStep(2);
      return;
    }
    if (bankStep && !/^\d{5,30}$/.test(accountNumber.replace(/[\s-]/g, ''))) {
      setError('Nomor rekening perlu berisi 5–30 angka.');
      return;
    }
    setPending(true);
    try {
      let result;
      if (surveyorRegistration) {
        const response = await fetch('/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            accountRole: 'surveyor',
            surveyorProfile: {
              username: username.trim(),
              fullName: name.trim(),
              bankName: bankName.trim(),
              accountName: accountName.trim(),
              accountNumber,
              consent,
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 409) {
            setStep(1);
            requestAnimationFrame(() => stepTitle.current?.focus());
          }
          throw new Error(data.error || data.message || 'Pendaftaran belum berhasil.');
        }
        result = { error: null };
      } else if (isSurveyor) {
        const response = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, accountRole: 'surveyor' }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || data.message || 'Email/username atau kata sandi tidak cocok.');
        result = { error: null };
      } else {
        result = register
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
      }
      if (result.error) {
        setError(result.error.message ?? 'Periksa email dan kata sandi Anda.');
        return;
      }
      const contextResponse = await fetch('/api/account/context');
      const context = await contextResponse.json();
      if (!contextResponse.ok) throw new Error(context.error || 'Akses akun belum dapat diperiksa.');
      setAccountNumber('');
      setPassword('');
      router.replace(
        invitationToken
          ? '/invite/surveyor/' + encodeURIComponent(invitationToken)
          : context.role === 'surveyor'
            ? '/surveyor'
            : '/studio',
      );
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-entry">
      <Link href="/" className="auth-entry-brand" aria-label="Beranda SurveyDash Studio">
        <Brand />
      </Link>
      <section className="auth-entry-card" aria-labelledby="auth-entry-title">
        <header className="auth-entry-heading">
          <h1 id="auth-entry-title">{register ? 'Daftar' : 'Masuk'}</h1>
          <p>{isSurveyor ? 'Surveyor' : 'Pengelola Survei'}</p>
          <Link
            href={loginHref(isSurveyor ? 'manager' : 'surveyor', register)}
            className="auth-entry-role-switch"
            aria-disabled={pending || undefined}
            onClick={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            {isSurveyor ? 'Ganti ke Pengelola Survei' : 'Ganti ke Surveyor'}
          </Link>
        </header>
        {surveyorRegistration && (
          <ol className="auth-entry-steps" aria-label="Langkah pendaftaran">
            <li aria-current={step === 1 ? 'step' : undefined}>1. Akun</li>
            <li aria-current={step === 2 ? 'step' : undefined}>2. Rekening</li>
          </ol>
        )}
        <form onSubmit={submit} aria-busy={pending}>
          <fieldset className="auth-entry-fields" disabled={pending}>
            {surveyorRegistration && (
              <h2 ref={stepTitle} tabIndex={-1} className="auth-entry-step-title" aria-live="polite">
                {bankStep ? 'Rekening' : 'Akun'}
              </h2>
            )}
            {bankStep ? (
              <>
                <div className="field">
                  <label htmlFor="surveyor-bank">Bank / penyedia rekening</label>
                  <input
                    id="surveyor-bank"
                    className="input"
                    required
                    minLength={2}
                    maxLength={80}
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="surveyor-account-name">Nama pemilik rekening</label>
                  <input
                    id="surveyor-account-name"
                    className="input"
                    required
                    minLength={2}
                    maxLength={100}
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="surveyor-account-number">Nomor rekening</label>
                  <input
                    id="surveyor-account-number"
                    className="input"
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={40}
                    autoComplete="off"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                  />
                </div>
                <p className="auth-entry-note">
                  Rekening disimpan privat untuk administrasi. Nama dan username Anda tampil di form
                  responden.
                </p>
                <label className="auth-entry-consent">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    Saya menyetujui{' '}
                    <Link href="/privacy" target="_blank" rel="noreferrer">
                      Kebijakan Privasi
                    </Link>{' '}
                    dan{' '}
                    <Link href="/terms" target="_blank" rel="noreferrer">
                      Ketentuan
                    </Link>
                    .
                  </span>
                </label>
              </>
            ) : (
              <>
                {register && (
                  <div className="field">
                    <label htmlFor="name">Nama lengkap</label>
                    <input
                      id="name"
                      className="input"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                )}
                {surveyorRegistration && (
                  <div className="field">
                    <label htmlFor="surveyor-username">Username</label>
                    <input
                      id="surveyor-username"
                      className="input"
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9][a-zA-Z0-9_]*"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      aria-describedby="surveyor-username-help"
                    />
                    <p id="surveyor-username-help" className="hint">
                      Huruf, angka, atau _. Tidak dapat diganti.
                    </p>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="email">{isSurveyor && !register ? 'Email atau username' : 'Email'}</label>
                  <input
                    id="email"
                    className="input"
                    required
                    type={isSurveyor && !register ? 'text' : 'email'}
                    maxLength={254}
                    autoComplete={isSurveyor && !register ? 'username' : 'email'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Kata sandi</label>
                  <input
                    id="password"
                    className="input"
                    required
                    type="password"
                    minLength={register ? 10 : 1}
                    maxLength={128}
                    autoComplete={register ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby={register ? 'auth-password-help' : undefined}
                  />
                  {register && (
                    <p id="auth-password-help" className="hint">
                      Minimal 10 karakter.
                    </p>
                  )}
                </div>
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="auth-entry-error">
              {error}
            </p>
          )}
          <div className="auth-entry-actions">
            {bankStep && (
              <Button variant="secondary" disabled={pending} onClick={() => changeStep(1)}>
                Kembali
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {surveyorRegistration && !bankStep ? 'Lanjut' : register ? 'Daftar' : 'Masuk'}
            </Button>
          </div>
        </form>
        <p className="auth-entry-mode">
          {register ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <Link
            href={loginHref(role, !register)}
            aria-disabled={pending || undefined}
            onClick={(event) => {
              if (pending) event.preventDefault();
            }}
          >
            {register ? 'Masuk' : 'Daftar'}
          </Link>
        </p>
        {!register && (
          <div className="auth-entry-help">
            {recoveryAvailable ? (
              <Link href="/forgot-password">Lupa kata sandi?</Link>
            ) : (
              <a href={'mailto:' + supportEmail}>Bantuan akun</a>
            )}
          </div>
        )}
      </section>
      <Link href="/surveys" className="auth-entry-respondent">
        Isi survei
      </Link>
    </main>
  );
}
