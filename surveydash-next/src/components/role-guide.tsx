'use client';

import { createPortal } from 'react-dom';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { publishTourCoach } from './tour-host';
import { MOTION_SETTLED } from '@/lib/dashboard-motion';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Check, Loader2, X } from 'lucide-react';
import type { GuideRole } from '@/lib/guides';
import {
  placeTourCard,
  tourAdvanceIndex,
  tourClosedIndex,
  tourBackIndex,
  tourPlan,
  TOUR_CREATED,
  TOUR_OPEN,
  type TourRect,
  type TourStep,
} from '@/lib/guided-tour';
import { Button } from './ui';
import '@/app/role-guide.css';

type Snapshot = {
  target: HTMLElement | null;
  rect: TourRect | null;
  slot: HTMLElement | null;
  width: number;
  height: number;
  disabled: boolean;
};
const byName = (name: string) => `[data-tour="${name}"]`;
function activeDialog() {
  return [...document.querySelectorAll<HTMLElement>('[data-guide-dialog][data-state="open"]')].at(-1) ?? null;
}
function visible(selector: string) {
  return (
    [...(activeDialog() ?? document).querySelectorAll<HTMLElement>(selector)].find((element) => {
      const rect = element.getBoundingClientRect();
      return (
        element.isConnected &&
        !element.closest('[hidden],[inert]') &&
        rect.width > 0 &&
        rect.height > 0 &&
        getComputedStyle(element).visibility !== 'hidden'
      );
    }) ?? null
  );
}

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
      onClick={() => window.dispatchEvent(new CustomEvent(TOUR_OPEN, { detail: role }))}
    >
      <BookOpen size={17} aria-hidden="true" />
      {children}
    </button>
  );
}

export function RoleGuide({ role }: { role: GuideRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const home = role === 'manager' ? '/studio' : '/surveyor';
  const [requested, setRequested] = useState(false);
  const [plan, setPlan] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [cardHeight, setCardHeight] = useState(235);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const visited = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const lastResult = useRef<'completed' | 'skipped'>('skipped');
  const pendingSave = useRef(false);
  const editorPath = useRef<string | null>(null);
  const phase = plan[index];
  const isHome = pathname === home;

  function restart() {
    activeDialog()?.querySelector<HTMLButtonElement>('.modal-close')?.click();
    setPlan([]);
    setIndex(0);
    setSnapshot(null);
    setRequested(true);
    setSaveError('');
    if (pathname !== home) router.push(home);
  }

  useEffect(() => {
    function replay(event: Event) {
      if ((event as CustomEvent).detail !== role) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      visited.current = true;
      setPlan([]);
      setIndex(0);
      setSnapshot(null);
      setSaveError('');
      setRequested(true);
      if (window.location.pathname !== home) router.push(home);
    }
    window.addEventListener(TOUR_OPEN, replay);
    return () => window.removeEventListener(TOUR_OPEN, replay);
  }, [role, home, router]);

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
        if (state.role === role && state.status === 'new') setRequested(true);
      } catch {
        /* A guide request must never prevent normal work. */
      }
    }
    void load();
    return () => controller.abort();
  }, [isHome, role]);

  useEffect(() => {
    if (!requested) return;
    return () => {
      document.documentElement.style.removeProperty('--tour-viewport');
      delete document.documentElement.dataset.tourCompact;
    };
  }, [requested]);
  async function saveResult(status: 'completed' | 'skipped') {
    if (pendingSave.current) return;
    pendingSave.current = true;
    lastResult.current = status;
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/account/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Status panduan belum tersimpan.');
    } catch {
      setSaveError('Status panduan belum tersimpan. Anda tetap bisa melanjutkan pekerjaan.');
    } finally {
      pendingSave.current = false;
      setSaving(false);
    }
  }
  function finish(status: 'completed' | 'skipped') {
    setRequested(false);
    const focus = returnFocus.current?.isConnected ? returnFocus.current : snapshot?.target;
    requestAnimationFrame(() => focus?.focus({ preventScroll: true }));
    void saveResult(status);
  }

  useEffect(() => {
    if (!requested) return;
    let frame = 0;
    let observed: HTMLElement | null = null;
    const resize = new ResizeObserver(schedule);
    function refresh() {
      frame = 0;
      const viewportHeight = Math.min(
        window.innerHeight,
        window.visualViewport?.height ?? window.innerHeight,
      );
      document.documentElement.style.setProperty('--tour-viewport', viewportHeight + 'px');
      document.documentElement.dataset.tourCompact = String(viewportHeight < 400);
      const dialog = activeDialog();
      if (!plan.length) {
        setSnapshot((previous) =>
          previous?.slot === (dialog?.querySelector('[data-tour-host]') ?? null)
            ? previous
            : {
                target: null,
                rect: null,
                slot: dialog?.querySelector<HTMLElement>('[data-tour-host]') ?? null,
                width: window.innerWidth,
                height: window.visualViewport?.height ?? window.innerHeight,
                disabled: false,
              },
        );
        const ready = visible(byName(role === 'manager' ? 'create-survey' : 'surveyor-tasks'));
        if (ready) {
          setPlan(
            tourPlan(
              role,
              !!visible(byName('surveyor-preview')),
              !!visible(`${byName('surveyor-copy')}:not(:disabled)`),
            ),
          );
          setIndex(0);
        }
        return;
      }
      const target = phase ? visible(phase.target) : null;
      const disabled = target instanceof HTMLButtonElement && target.disabled;
      if (observed !== target) {
        if (observed) resize.unobserve(observed);
        if (target) resize.observe(target);
        observed = target;
      }
      const bounds = target?.getBoundingClientRect();
      const rect = bounds
        ? {
            left: Math.round(bounds.left),
            top: Math.round(bounds.top),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height),
          }
        : null;
      const slot = dialog?.querySelector<HTMLElement>('[data-tour-host]') ?? null;
      const width = window.innerWidth,
        height = Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight);
      setSnapshot((previous) =>
        previous &&
        previous.target === target &&
        previous.slot === slot &&
        previous.width === width &&
        previous.height === height &&
        previous.disabled === disabled &&
        JSON.stringify(previous.rect) === JSON.stringify(rect)
          ? previous
          : { target, rect, slot, width, height, disabled },
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(refresh);
    }
    const changes = new MutationObserver((records) => {
      if (
        records.some(
          (record) => !(record.target instanceof Element && record.target.closest('[data-tour-layer]')),
        )
      )
        schedule();
    });
    changes.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'disabled', 'data-state', 'aria-hidden'],
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener(MOTION_SETTLED, schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    document.addEventListener('animationend', schedule, true);
    document.addEventListener('transitionend', schedule, true);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener(MOTION_SETTLED, schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      document.removeEventListener('animationend', schedule, true);
      document.removeEventListener('transitionend', schedule, true);
    };
  }, [requested, plan, phase, role]);

  useEffect(() => {
    if (!requested || !plan.length) return;
    function click(event: MouseEvent) {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-tour-action],[data-tour]')
          : null;
      const action = button?.dataset.tourAction ?? button?.dataset.tour;
      if (action) setIndex((current) => tourAdvanceIndex(plan, current, action));
    }
    function created(event: Event) {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (id) editorPath.current = '/studio/' + encodeURIComponent(id);
      if (role === 'manager') setIndex((current) => tourAdvanceIndex(plan, current, 'created'));
    }
    document.addEventListener('click', click);
    function closed(event: Event) {
      const target = event.target instanceof Element ? event.target.closest('.modal-close') : null;
      if (target) setIndex((current) => tourClosedIndex(plan, current));
    }
    document.addEventListener('click', closed);
    window.addEventListener(TOUR_CREATED, created);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('click', closed);
      window.removeEventListener(TOUR_CREATED, created);
    };
  }, [requested, plan, role]);

  useEffect(() => {
    if (!requested) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish('skipped');
      }
    }
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  });

  useEffect(() => {
    if (!requested || !snapshot?.target) return;
    const target = snapshot.target;
    const oldDescription = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', [oldDescription, 'tour-instructions'].filter(Boolean).join(' '));
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      if (phase?.id === 'name') target.focus({ preventScroll: true });
      else
        (snapshot.slot?.querySelector<HTMLElement>('[data-tour-title]') ?? heading.current)?.focus({
          preventScroll: true,
        });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (oldDescription === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', oldDescription);
    };
  }, [requested, phase?.id, snapshot?.target, snapshot?.slot]);

  useEffect(() => {
    if (!requested || !card.current) return;
    const element = card.current;
    const resize = new ResizeObserver(() =>
      setCardHeight((old) => (old === element.offsetHeight ? old : element.offsetHeight)),
    );
    resize.observe(element);
    return () => resize.disconnect();
  }, [requested, phase?.id, snapshot?.slot]);

  function next() {
    if (!phase || !snapshot?.target) return;
    if (phase.waitForCreate) {
      if (snapshot.target instanceof HTMLButtonElement && !snapshot.target.disabled) snapshot.target.click();
      return;
    }
    if (
      phase.id === 'name' &&
      snapshot.target instanceof HTMLInputElement &&
      !snapshot.target.reportValidity()
    )
      return;
    if (phase.clickNext) {
      const preferredTask =
        phase.id === 'tasks'
          ? visible(`${byName('surveyor-copy')}:not(:disabled)`)?.closest('.surveyor-task')
          : null;
      const nextButton =
        phase.clickNext === 'surveyor-close-preview'
          ? snapshot.target.closest('[role="dialog"]')?.querySelector<HTMLElement>('.modal-close')
          : (preferredTask?.querySelector<HTMLElement>(byName(phase.clickNext)) ??
            visible(byName(phase.clickNext)));
      if (!nextButton || (nextButton instanceof HTMLButtonElement && nextButton.disabled)) return;
      nextButton.click();
    }
    if (index === plan.length - 1) finish('completed');
    else setIndex(index + 1);
  }

  function recover() {
    const modal = activeDialog();
    if (modal) {
      modal.querySelector<HTMLButtonElement>('.modal-close')?.click();
      return;
    }
    const tabs: Record<string, string> = {
      questions: 'questions',
      form: 'form',
      invite: 'surveyors',
      data: 'data',
      analysis: 'analytics',
    };
    const tab = tabs[phase?.id ?? ''];
    if (tab) {
      const control = document.querySelector<HTMLButtonElement>(byName('editor-tab-' + tab));
      if (control) {
        control.click();
        return;
      }
      if (editorPath.current) {
        router.push(editorPath.current);
        return;
      }
    }
    restart();
  }
  function back() {
    const previousIndex = tourBackIndex(plan, index);
    if (previousIndex === index) return;
    const previous = plan[previousIndex];
    const tabs: Record<string, string> = {
      questions: 'questions',
      form: 'form',
      invite: 'surveyors',
      data: 'data',
      analysis: 'analytics',
    };
    if (tabs[previous.id])
      document.querySelector<HTMLButtonElement>(byName('editor-tab-' + tabs[previous.id]))?.click();
    if (previous.id === 'preview')
      document.querySelector<HTMLButtonElement>(byName('surveyor-preview'))?.click();
    if (previous.id === 'tasks') activeDialog()?.querySelector<HTMLButtonElement>('.modal-close')?.click();
    setIndex(previousIndex);
  }
  const inline = !!snapshot?.slot;
  const position = placeTourCard(
    snapshot?.rect ?? null,
    { width: 340, height: cardHeight },
    { width: snapshot?.width ?? 390, height: snapshot?.height ?? 700 },
  );
  const rect = snapshot?.rect;
  const width = snapshot?.width ?? 0,
    height = snapshot?.height ?? 0;
  const left = Math.max(0, (rect?.left ?? 0) - 6),
    top = Math.max(0, (rect?.top ?? 0) - 6);
  const right = Math.min(width, (rect?.left ?? 0) + (rect?.width ?? 0) + 6),
    bottom = Math.min(height, (rect?.top ?? 0) + (rect?.height ?? 0) + 6);
  const coach = (
    <div
      data-tour-layer
      data-role-guide={role}
      ref={inline ? undefined : card}
      className={`tour-coach ${inline ? 'tour-coach-inline' : ''}`}
      style={inline ? undefined : { left: position.left, top: position.top, width: position.width }}
      role="region"
      aria-labelledby="tour-title"
      aria-describedby="tour-instructions"
    >
      <div className="tour-coach-top">
        <span>{phase ? `${index + 1} / ${plan.length}` : 'PANDUAN'}</span>
        <button type="button" onClick={() => finish('skipped')} aria-label="Skip panduan">
          <X size={16} />
        </button>
      </div>
      <h2 id="tour-title" data-tour-title="" ref={inline ? undefined : heading} tabIndex={-1}>
        {phase?.title ?? 'Menyiapkan panduan…'}
      </h2>
      <p id="tour-instructions" aria-live="polite">
        {snapshot?.target
          ? phase?.description
          : 'Menunggu bagian ini terbuka. Anda bisa melewati panduan kapan saja.'}
      </p>
      <div className="tour-coach-actions">
        <div className="tour-secondary-actions">
          {index > 0 && phase?.id !== 'questions' && (
            <Button variant="ghost" onClick={back}>
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={() => finish('skipped')}>
            Skip
          </Button>
        </div>
        {phase && !snapshot?.target ? (
          <Button variant="secondary" onClick={recover}>
            Buka langkah
          </Button>
        ) : (
          <Button onClick={next} disabled={!snapshot?.target || snapshot.disabled}>
            {phase?.waitForCreate ? (
              'Buat survei'
            ) : index === plan.length - 1 ? (
              <>
                <Check size={16} />
                Selesai
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        )}
      </div>
      {phase?.waitForCreate && <small>Draf dibuat setelah tombol ini ditekan. Survei belum dibagikan.</small>}
    </div>
  );

  const updateHost = useEffectEvent((id: string) => publishTourCoach(id, coach));
  useLayoutEffect(() => {
    const id = snapshot?.slot?.dataset.tourHost;
    if (!requested || !id) return;
    updateHost(id);
    return () => publishTourCoach(id, null);
  }, [requested, snapshot, index, plan, cardHeight, role]);

  return (
    <>
      {requested &&
        createPortal(
          <div data-tour-layer className="tour-layer">
            {rect && !inline && right > left && bottom > top && (
              <>
                <div className="tour-shade" style={{ left: 0, top: 0, width, height: top }} />
                <div className="tour-shade" style={{ left: 0, top, width: left, height: bottom - top }} />
                <div
                  className="tour-shade"
                  style={{ left: right, top, width: width - right, height: bottom - top }}
                />
                <div
                  className="tour-shade"
                  style={{ left: 0, top: bottom, width, height: height - bottom }}
                />
              </>
            )}
            {rect && right > left && bottom > top && (
              <div
                className="tour-spotlight"
                style={{ left, top, width: right - left, height: bottom - top }}
                aria-hidden="true"
              />
            )}
            {!inline && coach}
          </div>,
          document.body,
        )}
      {saveError && (
        <div className="tour-save-error" role="alert">
          {saveError}
          <Button variant="secondary" onClick={() => void saveResult(lastResult.current)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Coba lagi'}
          </Button>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setSaveError('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
