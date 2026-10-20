export interface MotionBox {
  left: number;
  top: number;
  width: number;
  height: number;
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
