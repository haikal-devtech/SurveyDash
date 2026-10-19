'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Check, Loader2 } from 'lucide-react';
import { guideSteps, type GuideRole } from '@/lib/guides';
import { Button, Modal } from './ui';
import '@/app/role-guide.css';

const openGuideEvent = 'surveydash:open-guide';

export function GuideButton({
  role,
  children = 'Panduan singkat',
  className = '',
}: {
  role: GuideRole;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`btn btn-secondary ${className}`}
      data-guide-trigger={role}
      onClick={() => window.dispatchEvent(new CustomEvent(openGuideEvent, { detail: role }))}
    >
      <BookOpen size={17} aria-hidden="true" />
      {children}
    </button>
  );
}

export function RoleGuide({ role }: { role: GuideRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const visited = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const steps = guideSteps[role];
  const current = steps[step];
  const isHome = pathname === (role === 'manager' ? '/studio' : '/surveyor');

  useEffect(() => {
    function replay(event: Event) {
      if ((event as CustomEvent).detail !== role) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      visited.current = true;
      setStep(0);
      setError('');
      setOpen(true);
    }
    window.addEventListener(openGuideEvent, replay);
    return () => window.removeEventListener(openGuideEvent, replay);
  }, [role]);

  useEffect(() => {
    if (!isHome || visited.current) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/account/guide', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return;
        const state = await response.json();
        if (controller.signal.aborted || visited.current) return;
        visited.current = true;
        if (state.role === role && state.status === 'new') setOpen(true);
      } catch {
        /* The guide must never prevent access to the workspace. */
      }
    }
    void load();
    return () => controller.abort();
  }, [isHome, role]);

  async function finish(status: 'completed' | 'skipped') {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/account/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Panduan belum tersimpan. Coba lagi atau tutup untuk melanjutkan.');
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Koneksi gagal. Coba lagi.');
    } finally {
      setPending(false);
    }
  }

  function go(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) {
          setOpen(false);
          void finish('skipped');
        } else {
          setOpen(true);
        }
      }}
      title={role === 'manager' ? 'Mulai bersama SurveyDash' : 'Selamat datang, Surveyor'}
      description="Tiga langkah singkat. Panduan bisa dibuka lagi dari menu Bantuan."
      wide
      className="role-guide-modal"
      onCloseAutoFocus={(event) => {
        const fallback = [...document.querySelectorAll<HTMLElement>(`[data-guide-trigger="${role}"]`)].find(
          (button) => button.offsetParent !== null,
        );
        const target =
          returnFocus.current?.isConnected && returnFocus.current !== document.body
            ? returnFocus.current
            : fallback;
        if (target) {
          event.preventDefault();
          target.focus();
        }
      }}
    >
      <div className="role-guide" data-role-guide={role}>
        <Image
          src={`/brand/photos/${current.image}.webp`}
          alt=""
          width={1200}
          height={800}
          sizes="(max-width: 640px) 100vw, 390px"
          className="role-guide-photo"
        />
        <div className="role-guide-content">
          <ol className="role-guide-progress" aria-label="Langkah panduan">
            {steps.map((item, index) => (
              <li key={item.title} aria-current={step === index ? 'step' : undefined}>
                <span>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                <span className="sr-only">{item.title}</span>
              </li>
            ))}
          </ol>
          <p className="role-guide-count" aria-live="polite">
            Langkah {step + 1} dari {steps.length}
          </p>
          <h2 tabIndex={-1} ref={heading}>
            {current.title}
          </h2>
          <p>{current.description}</p>
          <div className="role-guide-tip">{current.tip}</div>
          {error && (
            <p role="alert" className="role-guide-error">
              {error}
            </p>
          )}
          <div className="role-guide-actions">
            <Button
              variant="ghost"
              onClick={() => (step ? go(step - 1) : void finish('skipped'))}
              disabled={pending}
            >
              {step ? (
                <>
                  <ArrowLeft size={16} />
                  Kembali
                </>
              ) : (
                'Lewati'
              )}
            </Button>
            <Button
              onClick={() => (step < steps.length - 1 ? go(step + 1) : void finish('completed'))}
              disabled={pending}
            >
              {pending ? <Loader2 size={17} className="animate-spin" /> : null}
              {step === steps.length - 1 ? 'Mulai sekarang' : 'Lanjut'}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
