'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck, BarChart3 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button, Badge } from './ui';

export function LoginForm({
  initialRegister = false,
  recoveryAvailable = false,
  supportEmail,
  role = 'manager',
}: {
  initialRegister?: boolean;
  recoveryAvailable?: boolean;
  supportEmail: string;
  role?: 'manager' | 'surveyor';
}) {
  const router = useRouter();
  const [register, setRegister] = useState(initialRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const isSurveyor = role === 'surveyor';
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      let result;
      if (register && isSurveyor) {
        const response = await fetch('/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            accountRole: 'surveyor',
            surveyorProfile: { username, fullName: name, bankName, accountName, accountNumber, consent },
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || data.message || 'Pendaftaran Surveyor belum berhasil.');
        result = { error: null };
      } else if (isSurveyor) {
        const response = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, accountRole: 'surveyor' }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || data.message || 'Username/email atau kata sandi tidak cocok.');
        result = { error: null };
      } else
        result = register
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? 'Tidak dapat masuk. Periksa email dan kata sandi.');
        return;
      }
      const contextResponse = await fetch('/api/account/context');
      const context = await contextResponse.json();
      if (!contextResponse.ok) throw new Error(context.error || 'Akses akun belum dapat diperiksa.');
      setAccountNumber('');
      router.replace(context.role === 'surveyor' ? '/surveyor' : '/studio');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-story">
        <Brand />
        <div>
          <Badge tone="purple">SURVEYDASH STUDIO</Badge>
          <h1 style={{ marginTop: 22 }}>
            Dari pertanyaan.
            <br />
            Menjadi <em>pemahaman.</em>
          </h1>
          <p>
            {isSurveyor
              ? 'Terima penugasan, pelajari pertanyaan, dan bagikan link pribadi kepada responden.'
              : 'Buat survei, kumpulkan jawaban, dan ceritakan hasilnya. Seluruh proses dalam satu ruang kerja.'}
          </p>
          <div className="auth-illustration">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Kepuasan masyarakat</span>
              <BarChart3 size={17} color="#b19bcc" />
            </div>
            <div className="auth-chart">
              {[45, 64, 52, 75, 68, 86, 80, 95].map((h, i) => (
                <span key={i} style={{ height: `${h}%`, background: i === 7 ? '#8a67c6' : undefined }} />
              ))}
            </div>
            <p style={{ fontSize: 10, marginTop: 12 }}>Form, data, dan presentasi saling terhubung.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, fontSize: 10, color: '#ab96bd' }}>
          <ShieldCheck size={14} />
          Data dikelola di workspace Anda
        </div>
      </div>
      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <Link href="/" className="auth-mobile-brand">
            <Brand />
          </Link>
          <div className="actions" style={{ marginBottom: 20 }}>
            <Link
              href={'/login?role=manager' + (register ? '&mode=signup' : '')}
              className={'btn btn-' + (!isSurveyor ? 'primary' : 'secondary')}
            >
              Pengelola Survei
            </Link>
            <Link
              href={'/login?role=surveyor' + (register ? '&mode=signup' : '')}
              className={'btn btn-' + (isSurveyor ? 'primary' : 'secondary')}
            >
              Surveyor
            </Link>
          </div>
          <h2>
            {register
              ? isSurveyor
                ? 'Daftar sebagai Surveyor.'
                : 'Mulai ruang kerja Anda.'
              : isSurveyor
                ? 'Masuk sebagai Surveyor.'
                : 'Selamat datang kembali.'}
          </h2>
          <p>
            {isSurveyor
              ? 'Akses survei yang ditugaskan kepada Anda. Pertanyaan dan jawaban responden dikelola oleh Pengelola Survei.'
              : register
                ? 'Buat akun untuk menyusun pertanyaan, mengelola data, dan membuat presentasi. Workspace baru dimulai kosong.'
                : 'Masuk untuk melanjutkan cerita di balik data Anda.'}
          </p>
          {register && (
            <div className="field">
              <label htmlFor="name">Nama lengkap</label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Nama Anda"
              />
            </div>
          )}
          {register && isSurveyor && (
            <>
              <div className="field">
                <label htmlFor="surveyor-username">Username unik</label>
                <input
                  id="surveyor-username"
                  className="input"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9][a-zA-Z0-9_]*"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <p className="hint">
                  Misalnya haikal_01. Nama lengkap boleh sama; username ini tidak dapat diganti setelah
                  daftar.
                </p>
              </div>
              <div className="field">
                <label htmlFor="surveyor-bank">Nama bank atau penyedia rekening</label>
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
                  inputMode="numeric"
                  type="text"
                  maxLength={40}
                  autoComplete="off"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                />
                <p className="hint">
                  Disimpan privat untuk administrasi pembayaran jika ada kesepakatan. Rekening tidak
                  ditampilkan kepada responden; pembayaran otomatis belum tersedia.
                </p>
              </div>
              <label style={{ display: 'flex', gap: 8, lineHeight: 1.7, fontSize: 12, marginBottom: 18 }}>
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  Saya menyetujui penggunaan profil dan rekening sesuai{' '}
                  <Link href="/privacy" target="_blank" rel="noreferrer">
                    Kebijakan Privasi
                  </Link>
                  . Nama dan username ditampilkan pada form dari link saya.
                </span>
              </label>
            </>
          )}
          <div className="field">
            <label htmlFor="email">{isSurveyor && !register ? 'Email atau username' : 'Alamat email'}</label>
            <input
              id="email"
              className="input"
              type={isSurveyor && !register ? 'text' : 'email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={isSurveyor && !register ? 'username' : 'email'}
              placeholder={isSurveyor && !register ? 'haikal_01 atau email Anda' : 'nama@instansi.id'}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Kata sandi</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={register ? 10 : 1}
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Minimal 10 karakter' : 'Masukkan kata sandi'}
            />
          </div>
          {error && (
            <div role="alert" className="banner banner-error" style={{ marginTop: 17 }}>
              {error}
            </div>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : null}
            {isSurveyor
              ? register
                ? 'Buat akun Surveyor'
                : 'Masuk ke portal Surveyor'
              : register
                ? 'Buat workspace'
                : 'Masuk ke workspace'}
            <ArrowRight size={15} />
          </Button>
          <button
            type="button"
            className="auth-toggle"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <strong>{register ? 'Masuk' : isSurveyor ? 'Daftar Surveyor' : 'Buat workspace'}</strong>
          </button>
          {!register &&
            (recoveryAvailable ? (
              <Link href="/forgot-password" className="auth-toggle">
                Lupa kata sandi?
              </Link>
            ) : (
              <a href={'mailto:' + supportEmail} className="auth-toggle">
                Butuh bantuan akses akun?
              </a>
            ))}
          <Link href="/surveys" className="auth-toggle">
            Buka portal responden →
          </Link>
        </form>
      </div>
    </div>
  );
}
