export const MOTION_SETTLED = 'surveydash:motion-settled';

export interface MotionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One small arrival, bounded even when a dashboard contains many cards. */
export function sceneMotion(index: number, compact = false, reduced = false) {
  if (reduced) return null;
  const order = Number.isFinite(index) ? Math.max(0, Math.min(6, Math.floor(index))) : 0;
  return {
    frames: [
      { opacity: 0.4, transform: `translateY(${compact ? 6 : 12}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    options: {
      duration: compact ? 260 : 360,
      delay: order * (compact ? 12 : 22),
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards' as const,
    },
  };
}

function valid(box: MotionBox) {
  return Object.values(box).every(Number.isFinite) && box.width > 0 && box.height > 0;
}

/** Position-only FLIP keeps text legible when a table becomes a card grid. */
export function listMotionFrames(
  before: MotionBox | undefined,
  after: MotionBox,
  reducedMotion = false,
): { transform?: string; opacity?: number }[] | null {
  if (reducedMotion || !valid(after)) return null;
  if (!before || !valid(before)) {
    return [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'none' },
    ];
  }
  const x = Math.round((before.left - after.left) * 100) / 100;
  const y = Math.round((before.top - after.top) * 100) / 100;
  if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return null;
  // A distant grid/table change fades in place rather than sweeping across the screen.
  if (Math.hypot(x, y) > 180) return [{ opacity: 0.35 }, { opacity: 1 }];
  return [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }];
}
