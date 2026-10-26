// My calendar week strip paging (prototype profile.calendar.swipe.js): a long enough drag or a flick pages the week,
// anything shorter springs back. RNGH's velocityX already drops a finger that stopped, so STALE_MS is not needed.

/** Finger travel before a press becomes a drag (taps on a day still work). */
export const START_PX = 6;
/** Released past a quarter of the strip width: page. */
export const PAGE_SHARE = 0.25;
/** ...and never on less travel than this. */
export const PAGE_MIN_PX = 40;
/** Or flicked faster than this (0.4 px/ms)... */
export const FLICK_PX_S = 400;
/** ...after at least this much travel. */
export const FLICK_MIN_PX = 16;

/** Week step after a drag of dx at velocity vx (px/s) on a strip `width` wide: +1 next, -1 previous, 0 stay. */
export function pageOf(dx: number, vx: number, width: number): -1 | 0 | 1 {
  'worklet';
  const far = Math.abs(dx) > Math.max(width * PAGE_SHARE, PAGE_MIN_PX);
  const flick =
    Math.abs(vx) > FLICK_PX_S && Math.abs(dx) >= FLICK_MIN_PX && Math.sign(vx) === Math.sign(dx);
  if (!far && !flick) return 0;
  return dx < 0 ? 1 : -1;
}
