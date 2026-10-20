'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { listMotionFrames, type MotionBox } from '@/lib/dashboard-motion';
import { useDashboardMotion } from './dashboard-motion-context';

const preference = '(prefers-reduced-motion: reduce)';
const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-motion-key]')];

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
}: {
  children: ReactNode;
  activeKey: string;
  className: string;
  label: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; width: number } | null>(null);
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
      const next = { x: target.left - bounds.left + root!.scrollLeft, width: target.width };
      setPosition((old) =>
        old && Math.abs(old.x - next.x) < 0.5 && Math.abs(old.width - next.width) < 0.5 ? old : next,
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
    <nav ref={ref} className={`${className} dashboard-selection-rail`} aria-label={label}>
      {position && (
        <span
          className="dashboard-selection-line"
          aria-hidden="true"
          style={{ transform: `translateX(${position.x}px) scaleX(${position.width})` }}
        />
      )}
      {children}
    </nav>
  );
}
