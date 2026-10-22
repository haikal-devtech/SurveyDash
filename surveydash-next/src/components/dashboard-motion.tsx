'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { listMotionFrames, sceneMotion, MOTION_SETTLED, type MotionBox } from '@/lib/dashboard-motion';
import { useDashboardMotion } from './dashboard-motion-context';

const preference = '(prefers-reduced-motion: reduce)';
const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-motion-key]')];

/** Animate only marked surfaces. No hidden CSS state or remount of the user's form. */
export function MotionScene({
  children,
  motionKey,
  className,
}: {
  children: ReactNode;
  motionKey: string;
  className?: string;
}) {
  const enabled = useDashboardMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root) return;
    const media = window.matchMedia(preference);
    const animations: Animation[] = [];
    const cancel = () => {
      for (const animation of animations) animation.cancel();
      window.dispatchEvent(new Event(MOTION_SETTLED));
    };
    if (!media.matches && !document.hidden) {
      const surfaces = [...root.querySelectorAll<HTMLElement>('[data-motion-enter]')]
        .filter((item) => item.closest('[data-motion-scene]') === root)
        .filter((item) => {
          const box = item.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && box.top < window.innerHeight && box.bottom > 0;
        })
        .slice(0, 12);
      // All layout reads above finish before any animation starts.
      surfaces.forEach((item, index) => {
        const plan = sceneMotion(index, window.innerWidth <= 600);
        if (!plan || typeof item.animate !== 'function') return;
        try {
          const animation = item.animate(plan.frames, plan.options);
          animations.push(animation);
          animation.onfinish = () => {
            animation.cancel();
            window.dispatchEvent(new Event(MOTION_SETTLED));
          };
        } catch {
          /* A decorative arrival must never block normal use. */
        }
      });
    }
    media.addEventListener('change', cancel);
    document.addEventListener('visibilitychange', cancel);
    window.addEventListener('resize', cancel, { passive: true });
    window.addEventListener('beforeprint', cancel);
    return () => {
      cancel();
      media.removeEventListener('change', cancel);
      document.removeEventListener('visibilitychange', cancel);
      window.removeEventListener('resize', cancel);
      window.removeEventListener('beforeprint', cancel);
    };
  }, [enabled, motionKey]);
  return (
    <div ref={ref} className={className} data-motion-scene="">
      {children}
    </div>
  );
}

/** Capture only explicit list actions; typing and initial rendering remain instant. */
export function useListMotion() {
  const enabled = useDashboardMotion();
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<Map<string, MotionBox> | null>(null);
  const running = useRef(new Map<HTMLElement, Animation>());
  const cancelAnimations = useCallback(() => {
    for (const animation of running.current.values()) animation.cancel();
    running.current.clear();
  }, []);
  const reset = useCallback(() => {
    previous.current = null;
    cancelAnimations();
  }, [cancelAnimations]);
  const capture = useCallback(() => {
    if (!enabled || !ref.current || document.hidden || window.matchMedia(preference).matches) {
      reset();
      return;
    }
    // Read visual positions before cancelling an interrupted animation.
    previous.current = new Map(
      items(ref.current).map((item) => [item.dataset.motionKey!, item.getBoundingClientRect()]),
    );
    cancelAnimations();
  }, [enabled, reset, cancelAnimations]);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = null;
    if (!before || !ref.current || document.hidden || window.matchMedia(preference).matches) return;
    // Batch all layout reads before starting any animation writes.
    const plans = items(ref.current).map((item) => ({
      item,
      frames: listMotionFrames(before.get(item.dataset.motionKey!), item.getBoundingClientRect()),
    }));
    for (const { item, frames } of plans) {
      if (!frames || typeof item.animate !== 'function') continue;
      try {
        const animation = item.animate(frames, { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
        running.current.set(item, animation);
        animation.onfinish = () => {
          if (running.current.get(item) === animation) running.current.delete(item);
          animation.cancel();
          window.dispatchEvent(new Event(MOTION_SETTLED));
        };
      } catch {
        // Optional motion must never prevent a filter, sort, or view change.
      }
    }
  });

  useEffect(() => {
    const media = window.matchMedia(preference);
    media.addEventListener('change', reset);
    window.addEventListener('resize', reset, { passive: true });
    document.addEventListener('visibilitychange', reset);
    return () => {
      media.removeEventListener('change', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
      reset();
    };
  }, [reset]);
  return { ref, capture, reset };
}

/** The underline moves between real selected controls without replacing their semantics. */
export function SelectionRail({
  children,
  activeKey,
  className,
  label,
  surface = false,
}: {
  children: ReactNode;
  activeKey: string;
  className: string;
  label: string;
  surface?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    function measure() {
      const selected = root!.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
      if (!selected) {
        setPosition(null);
        return;
      }
      const bounds = root!.getBoundingClientRect(),
        target = selected.getBoundingClientRect();
      const next = {
        x: target.left - bounds.left + root!.scrollLeft,
        y: target.top - bounds.top + root!.scrollTop,
        width: target.width,
        height: target.height,
      };
      setPosition((old) =>
        old &&
        Object.keys(next).every(
          (key) => Math.abs(old[key as keyof typeof next] - next[key as keyof typeof next]) < 0.5,
        )
          ? old
          : next,
      );
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(root);
    for (const control of root.querySelectorAll('a, button')) observer?.observe(control);
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [activeKey]);
  return (
    <nav
      ref={ref}
      className={`${className} dashboard-selection-rail ${surface ? 'dashboard-selection-surface' : ''}`}
      data-rail-ready={!!position}
      aria-label={label}
    >
      {position && (
        <span
          className={surface ? 'dashboard-selection-pill' : 'dashboard-selection-line'}
          aria-hidden="true"
          style={
            surface
              ? {
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  width: position.width,
                  height: position.height,
                }
              : { transform: `translateX(${position.x}px) scaleX(${position.width})` }
          }
        />
      )}
      {children}
    </nav>
  );
}
