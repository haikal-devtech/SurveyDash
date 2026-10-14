'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck, BarChart3 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Brand } from './brand';
import { Button, Badge } from './ui';

export function LoginForm({ initialRegister = false }: { initialRegister?: boolean }) {
  const router = useRouter();
  const [register, setRegister] = useState(initialRegister);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = register
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? 'Tidak dapat masuk. Periksa email dan kata sandi.');
        return;
      }
      router.replace('/studio');
      router.refresh();
    } catch {
      setError('Koneksi gagal. Coba lagi.');
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
            Buat survei, kumpulkan jawaban, dan ceritakan hasilnya. Seluruh proses dalam satu ruang kerja.
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
          <h2>{register ? 'Mulai ruang kerja Anda.' : 'Selamat datang kembali.'}</h2>
          <p>
            {register
              ? 'Buat akun untuk mencoba form builder, data, dan presentasi. Workspace baru berisi contoh survei dengan data simulasi.'
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
          <div className="field">
            <label htmlFor="email">Alamat email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nama@instansi.id"
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
            {register ? 'Buat workspace' : 'Masuk ke workspace'}
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
            <strong>{register ? 'Masuk' : 'Buat workspace'}</strong>
          </button>
          <Link href="/surveys" className="auth-toggle">
            Buka portal responden →
          </Link>
        </form>
      </div>
    </div>
  );
}
