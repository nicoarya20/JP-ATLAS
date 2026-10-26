// Where the tab bubble sits under a finger (prototype kit/tabbar.jsx posAt). Worklets: the drag runs on the UI thread.

/** Px between the pill edge and the bubble (prototype PAD, the pill's padding). */
export const BUBBLE_PAD = 4;

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Bubble position as a fractional tab index whose centre is at `x` (px from the pill's left edge), clamped to
 * [0, n − 1]. `fallback` when the pill has no width yet (not laid out).
 */
export function posAt(
  x: number,
  width: number,
  n: number,
  fallback: number,
  pad = BUBBLE_PAD,
): number {
  'worklet';
  if (width <= 0 || n <= 0) return fallback;
  return clamp((x - pad) / ((width - 2 * pad) / n) - 0.5, 0, n - 1);
}

/** The tab a bubble at `pos` settles on when released. */
export function nearest(pos: number): number {
  'worklet';
  return Math.round(pos);
}
