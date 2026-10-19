'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Banknote,
  Check,
  ClipboardList,
  Copy,
  Eye,
  FileQuestion,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import type { SurveyorAssignment, SurveyorProfile } from '@/lib/surveyor-types';
import { Brand } from './brand';
import { Badge, Button, EmptyState, Modal } from './ui';
import { GuideButton, RoleGuide } from './role-guide';
import '@/app/workspace-experience.css';

interface PortalData {
  profile: SurveyorProfile | null;
  assignments: SurveyorAssignment[];
}

export function SurveyorShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Belum berhasil keluar. Coba lagi.');
      router.replace('/login?role=surveyor');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
      setPending(false);
    }
  }

  return (
    <div className="surveyor-shell">
      <header className="surveyor-header">
        <Link href="/surveyor" aria-label="Beranda surveyor SurveyDash">
          <Brand />
        </Link>
        <nav aria-label="Menu surveyor" className="surveyor-nav">
          <Link href="/surveyor" aria-current={pathname === '/surveyor' ? 'page' : undefined}>
            <ClipboardList size={17} />
            Tugas survei
          </Link>
          <Link href="/surveyor/profile" aria-current={pathname === '/surveyor/profile' ? 'page' : undefined}>
            <UserRound size={17} />
            Profil
          </Link>
          <GuideButton role="surveyor">Bantuan</GuideButton>
        </nav>
        <div className="surveyor-account">
          <span>{name}</span>
          <Button variant="ghost" onClick={signOut} disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Keluar
          </Button>
        </div>
      </header>
      <main className="surveyor-main">
        {error && (
          <div role="alert" className="banner banner-error">
            {error}
          </div>
        )}
        {children}
      </main>
      <footer className="surveyor-footer">
        <span>SurveyDash · Portal surveyor</span>
        <Link href="/privacy">Kebijakan privasi</Link>
        <Link href="/help">Bantuan</Link>
      </footer>
      <RoleGuide role="surveyor" />
    </div>
  );
}

export function SurveyorShareLink({ shareUrl, disabled = false }: { shareUrl: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).href);
      setCopied(true);
    } catch {
      setError('Salin otomatis belum tersedia. Pilih teks link di bawah untuk menyalinnya.');
    }
  }

  return (
    <div className="surveyor-share">
      <Button variant="secondary" onClick={copy} disabled={disabled || !shareUrl}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'Link tersalin' : 'Salin link responden'}
      </Button>
      {!disabled && shareUrl && (
        <input
          aria-label="Link responden milik surveyor"
          className="input surveyor-link-input"
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
      {copied && (
        <span className="surveyor-copy-status" role="status">
          Siap dibagikan ke responden.
        </span>
      )}
      {error && (
        <p className="surveyor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SurveyorProfileForm({
  profile,
  initialName,
  onSaved,
  onCancel,
}: {
  profile: SurveyorProfile | null;
  initialName: string;
  onSaved: (profile: SurveyorProfile) => void;
  onCancel?: () => void;
}) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.fullName ?? initialName);
  const [bankName, setBankName] = useState(profile?.bankName ?? '');
  const [accountName, setAccountName] = useState(profile?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/surveyor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, bankName, accountName, accountNumber, consent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Profil belum berhasil disimpan.');
      setAccountNumber('');
      onSaved(data.profile ?? data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card surveyor-profile-form" onSubmit={save}>
      <div className="surveyor-section-heading">
        <span className="surveyor-section-icon">
          <UserRound size={21} />
        </span>
        <div>
          <h2>{profile ? 'Perbarui profil surveyor' : 'Lengkapi profil untuk mulai bertugas'}</h2>
          <p>Username membedakan akun Anda. Nama lengkap boleh sama dengan orang lain.</p>
        </div>
      </div>
      <div className="surveyor-form-grid">
        <div className="field">
          <label htmlFor="surveyor-username">Username</label>
          <input
            id="surveyor-username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9][a-z0-9_]{2,29}"
            disabled={pending}
            readOnly={!!profile}
            placeholder="contoh: haikal_01"
            aria-describedby="surveyor-username-hint"
          />
          <p id="surveyor-username-hint" className="hint">
            {profile
              ? 'Username tetap setelah pendaftaran dan ditampilkan kepada responden.'
              : '3–30 huruf kecil, angka, atau garis bawah; diawali huruf atau angka. Ditampilkan kepada responden.'}
          </p>
        </div>
        <div className="field">
          <label htmlFor="surveyor-full-name">Nama lengkap</label>
          <input
            id="surveyor-full-name"
            className="input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            disabled={pending}
          />
          <p className="hint">Ditampilkan pada link dan form yang Anda bagikan.</p>
        </div>
      </div>
      <div className="surveyor-bank-intro">
        <Banknote size={20} />
        <div>
          <h3>Rekening surveyor</h3>
          <p>Untuk kebutuhan administrasi penugasan. Nomor rekening tidak ditampilkan kepada responden.</p>
        </div>
      </div>
      <div className="surveyor-form-grid">
        <div className="field">
          <label htmlFor="surveyor-bank-name">Nama bank</label>
          <input
            id="surveyor-bank-name"
            className="input"
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            required
            minLength={2}
            maxLength={80}
            disabled={pending}
            placeholder="Contoh: BCA, BRI, Mandiri"
          />
        </div>
        <div className="field">
          <label htmlFor="surveyor-account-name">Nama pemilik rekening</label>
          <input
            id="surveyor-account-name"
            className="input"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            required
            minLength={2}
            maxLength={100}
            disabled={pending}
            placeholder="Sesuai nama di rekening"
          />
        </div>
        <div className="field surveyor-field-wide">
          <label htmlFor="surveyor-account-number">
            Nomor rekening{profile ? ' (masukkan kembali)' : ''}
          </label>
          <input
            id="surveyor-account-number"
            className="input"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={5}
            maxLength={30}
            pattern="[0-9]{5,30}"
            disabled={pending}
            aria-describedby="surveyor-bank-hint"
          />
          <p id="surveyor-bank-hint" className="hint">
            {profile ? 'Nomor lengkap perlu dimasukkan kembali saat memperbarui profil. ' : ''}Periksa dengan
            teliti; penyimpanan profil tidak memproses pembayaran otomatis.
          </p>
        </div>
      </div>
      <label className="surveyor-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          disabled={pending}
        />
        <span>
          Saya menyetujui penggunaan data profil dan rekening untuk administrasi surveyor, serta memahami
          bahwa nama dan username saya terlihat oleh responden sesuai{' '}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            kebijakan privasi
          </Link>
          .
        </span>
      </label>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}
      <div className="surveyor-form-actions">
        {onCancel && (
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" disabled={pending || !consent}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {pending ? 'Menyimpan profil…' : 'Simpan profil surveyor'}
        </Button>
      </div>
    </form>
  );
}

function ProfileDetails({ profile, onEdit }: { profile: SurveyorProfile; onEdit: () => void }) {
  return (
    <section className="card surveyor-profile-details">
      <div className="surveyor-section-heading">
        <span className="surveyor-section-icon">
          <UserRound size={21} />
        </span>
        <div>
          <h2>{profile.fullName}</h2>
          <p>@{profile.username}</p>
        </div>
        <Badge tone="green">Profil lengkap</Badge>
      </div>
      <dl className="surveyor-profile-list">
        <div>
          <dt>Bank</dt>
          <dd>{profile.bankName}</dd>
        </div>
        <div>
          <dt>Pemilik rekening</dt>
          <dd>{profile.accountName}</dd>
        </div>
        <div>
          <dt>Nomor rekening</dt>
          <dd>•••• {profile.accountLast4}</dd>
        </div>
      </dl>
      <p className="hint">Nomor rekening ditampilkan sebagian untuk menjaga privasi Anda.</p>
      <Button variant="secondary" onClick={onEdit}>
        Ubah profil dan rekening
      </Button>
    </section>
  );
}

export function SurveyorPortal({
  profileOnly = false,
  initialName = '',
}: {
  profileOnly?: boolean;
  initialName?: string;
}) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<SurveyorAssignment | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/surveyor', { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Tugas survei belum berhasil dimuat.');
        setData(result);
        setError('');
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Koneksi gagal.');
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function profileSaved(profile: SurveyorProfile) {
    setData((previous) => ({ profile, assignments: previous?.assignments ?? [] }));
    setEditing(false);
    setSaved(true);
    setAttempt((value) => value + 1);
  }

  if (!data && !error)
    return (
      <div className="surveyor-loading" role="status">
        <Loader2 size={22} className="animate-spin" />
        Memuat portal surveyor…
      </div>
    );
  if (!data)
    return (
      <section className="card">
        <EmptyState icon={<RefreshCw size={24} />} title="Portal belum berhasil dimuat" description={error}>
          <Button
            onClick={() => {
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            Coba lagi
          </Button>
        </EmptyState>
      </section>
    );

  const activeTasks = data.assignments.filter((task) => task.active && task.status === 'open');
  const responseCount = data.assignments.reduce((total, task) => total + task.responseCount, 0);

  return (
    <>
      <div className="page-heading surveyor-page-heading">
        <div>
          <p className="eyebrow">PORTAL SURVEYOR</p>
          <h1>
            {profileOnly
              ? 'Profil dan rekening'
              : `Halo, ${(data.profile?.fullName ?? initialName).split(' ')[0]}.`}
          </h1>
          <p>
            {profileOnly
              ? 'Kelola identitas yang tampil ke responden dan rekening administrasi Anda.'
              : 'Tugas dan link survei Anda ada di sini.'}
          </p>
        </div>
        {!profileOnly && data.profile && (
          <Link href="/surveyor/profile" className="btn btn-secondary">
            <UserRound size={16} />
            Profil saya
          </Link>
        )}
        {profileOnly && (
          <Link href="/surveyor" className="btn btn-secondary">
            Lihat tugas
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
      {saved && (
        <div className="banner" role="status">
          <Check size={16} />
          Profil surveyor berhasil disimpan.
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
          <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>
            Muat ulang
          </Button>
        </div>
      )}
      {!data.profile || editing ? (
        <SurveyorProfileForm
          profile={data.profile}
          initialName={initialName}
          onSaved={profileSaved}
          onCancel={data.profile ? () => setEditing(false) : undefined}
        />
      ) : profileOnly ? (
        <ProfileDetails
          profile={data.profile}
          onEdit={() => {
            setSaved(false);
            setEditing(true);
          }}
        />
      ) : (
        <>
          <div className="surveyor-summary">
            <div className="card">
              <ClipboardList size={21} />
              <strong>{activeTasks.length}</strong>
              <span>Tugas terbuka</span>
            </div>
            <div className="card">
              <Check size={21} />
              <strong>{responseCount.toLocaleString('id-ID')}</strong>
              <span>Respons melalui link Anda</span>
            </div>
            <div className="card">
              <UserRound size={21} />
              <strong>@{data.profile.username}</strong>
              <span>Identitas yang terlihat responden</span>
            </div>
          </div>
          <div className="surveyor-task-heading">
            <h2>Tugas survei Anda</h2>
            <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw size={15} />
              Perbarui
            </Button>
          </div>
          {data.assignments.length === 0 ? (
            <section className="surveyor-welcome-card">
              <Image
                src="/brand/photos/surveyor.webp"
                width={1200}
                height={800}
                alt=""
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div>
                <span className="experience-eyebrow">SIAP MENERIMA TUGAS</span>
                <h3>Belum ada tugas survei</h3>
                <p>Minta link undangan dari Pengelola, lalu buka dan pilih Bergabung.</p>
                <p className="hint">
                  Username Anda: <strong>@{data.profile.username}</strong>
                </p>
                <GuideButton role="surveyor" />
              </div>
            </section>
          ) : (
            <div className="surveyor-task-grid">
              {data.assignments.map((task) => {
                const shareable = task.active && task.status === 'open';
                return (
                  <article className="card surveyor-task" key={task.id}>
                    <div className="surveyor-task-meta">
                      <span>{task.institution || 'Survei dari pengelola'}</span>
                      <Badge tone={shareable ? 'green' : 'neutral'}>
                        {!task.active
                          ? 'Penugasan nonaktif'
                          : task.status === 'open'
                            ? 'Terbuka'
                            : task.status === 'draft'
                              ? 'Belum dibuka'
                              : 'Ditutup'}
                      </Badge>
                    </div>
                    <h3>{task.title}</h3>
                    <p className="surveyor-task-count">
                      <FileQuestion size={15} />
                      {task.questions.length} pertanyaan<span>·</span>
                      {task.responseCount.toLocaleString('id-ID')} respons melalui link Anda
                    </p>
                    <Button
                      variant="ghost"
                      className="surveyor-preview-button"
                      onClick={() => setSelected(task)}
                    >
                      <Eye size={16} />
                      Lihat pertanyaan
                    </Button>
                    <div className="surveyor-task-link">
                      <p>
                        <Link2 size={15} />
                        Link pribadi @{data.profile?.username}
                      </p>
                      <SurveyorShareLink shareUrl={task.shareUrl} disabled={!shareable} />
                    </div>
                    {!shareable && (
                      <p className="hint">
                        {!task.active
                          ? 'Hubungi pengelola jika Anda perlu kembali ditugaskan.'
                          : 'Link dapat dibagikan setelah pengelola membuka survei.'}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <p className="surveyor-link-note task-link-note">
            Bagikan link dari kartu tugas Anda. Respons dari link itu selalu tercatat atas nama Anda, termasuk
            saat link diteruskan.
          </p>
        </>
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.title ?? 'Pertanyaan survei'}
        description="Tinjau instrumen sebelum membagikan link ke responden. Pertanyaan dikelola oleh pengelola survei."
        wide
      >
        <p className="surveyor-confidentiality-note">
          Pertanyaan tersedia untuk penugasan Anda. Untuk mengundang responden, bagikan link pribadi dari
          kartu tugas.
        </p>
        <ol className="surveyor-question-list">
          {selected?.questions.map((question, index) => (
            <li key={question.id}>
              <div className="surveyor-question-label">
                <span>{index + 1}</span>
                <h3>
                  {question.label}
                  {question.required && <span className="surveyor-required"> (wajib)</span>}
                </h3>
              </div>
              {question.description && <p>{question.description}</p>}
              {question.options.length > 0 ? (
                <ul>
                  {question.options.map((option) => (
                    <li key={option.id}>{option.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="hint">
                  Jawaban{' '}
                  {question.type === 'date' ? 'tanggal' : question.type === 'number' ? 'angka' : 'tertulis'}{' '}
                  dari responden.
                </p>
              )}
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
