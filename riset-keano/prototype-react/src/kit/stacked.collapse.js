// Stacked screen collapse, scrubbed by the scroll: as the content sheet scrolls up it pushes the search block away (the
// block fades and shrinks while the search icon in the header fades in, see .stk-find and .stk-find-ico in stacked.css),
// then an optional pinned row compacts step by step under the header. Let go of part way by a finger, each snaps.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Collapse at or past this share of the search block's height: from here the icon, not the bar, can be tapped and focused. */
const COLLAPSED_AT = 0.5;
/** Quiet time after the last scroll event (finger lifted, momentum spent) before a half-way fold snaps open or shut. */
const SNAP_IDLE_MS = 120;

const behavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const clamp01 = n => Math.min(1, Math.max(0, n));

/**
 * Measures the pinned row's tall and compact heights by setting --stk-q on it for one synchronous layout read each, and
 * writes them as --stk-pin-h (tall) and --stk-pin-shrink (tall - compact) on the screen. Returns the shrink in px.
 */
function measurePin(pin, screen) {
  const inner = pin.firstElementChild;
  pin.style.setProperty('--stk-q', '1');
  const compact = inner.offsetHeight;
  pin.style.setProperty('--stk-q', '0');
  const tall = inner.offsetHeight;
  pin.style.removeProperty('--stk-q');
  const shrink = Math.max(0, tall - compact);
  screen.style.setProperty('--stk-pin-h', `${tall}px`);
  screen.style.setProperty('--stk-pin-shrink', `${shrink}px`);
  return shrink;
}

/**
 * Tracks the scroll in two stretches and writes each as a 0..1 progress on the screen, so CSS drives the morph frame by
 * frame without re-rendering:
 * - --stk-p: how far the content has scrolled over the search block (0 = shown, 1 = gone);
 * - --stk-q: how far past the block, over the pinned row's shrink (0 = tall, 1 = compact). The row keeps its tall height
 *   in the flow and sticks that much above the top, so each pixel scrolled hides one pixel of it while it shrinks by one:
 *   the row's edge stays under the header and the content moves with the finger, never jumping.
 * When a touch scroll comes to rest part way through either stretch it snaps like an iOS large title: to the nearer end
 * (the search uses COLLAPSED_AT). Wheel and trackpad scrolling never snaps: their events pause mid-scroll with no release
 * to tell a pause from the end, so a slow scroll would be yanked away.
 * pinRef = the pinned row (.stk-pin), or a ref left empty when there is none.
 * Returns [ref for the search block, collapsed, reveal]; reveal scrolls back to the top and focuses the block's field
 * once it is reachable again.
 */
export function useSearchCollapse(pinRef) {
  const ref = useRef(null);
  const focusOnOpen = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const block = ref.current;
    const pin = pinRef?.current;
    const scroller = block.closest('.content');
    const screen = block.closest('.scr');
    let shrink = 0;
    let frame = 0;
    let timer = 0;
    let held = false;
    let released = false;   // a touch gesture has ended and its scroll has not come to rest yet
    const update = () => {
      frame = 0;
      const h = block.offsetHeight, top = scroller.scrollTop;
      const p = clamp01(top / (h || 1));
      screen.style.setProperty('--stk-p', p.toFixed(3));
      if (pin) screen.style.setProperty('--stk-q', (shrink ? clamp01((top - h) / shrink) : top > h ? 1 : 0).toFixed(3));
      setCollapsed(p >= COLLAPSED_AT);
    };
    const remeasure = () => { if (pin) shrink = measurePin(pin, screen); update(); };
    const snap = () => {
      timer = 0;
      if (held || !released) return;
      released = false;
      const h = block.offsetHeight, top = scroller.scrollTop;
      // 1 px slack: offsetHeight is rounded, scrollTop may not be
      let to = null;
      if (top >= 1 && top <= h - 1) to = top / h < COLLAPSED_AT ? 0 : h;
      else if (shrink && top >= h + 1 && top <= h + shrink - 1) to = top - h < shrink / 2 ? h : h + shrink;
      if (to !== null) scroller.scrollTo({ top: to, behavior: behavior() });
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(snap, SNAP_IDLE_MS); };
    // One update per frame: scroll fires faster than the screen paints
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); later(); };
    // A finger resting on the screen stops scroll events without letting go: wait for the release before snapping
    const onHold = () => { held = true; released = false; };
    const onRelease = () => { held = false; released = true; later(); };
    remeasure();
    // The row's heights change when the web font lands or the phone frame resizes
    let live = true;
    document.fonts?.ready.then(() => { if (live) remeasure(); });
    window.addEventListener('resize', remeasure);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('touchstart', onHold, { passive: true });
    scroller.addEventListener('touchend', onRelease);
    scroller.addEventListener('touchcancel', onRelease);
    return () => {
      live = false;
      window.removeEventListener('resize', remeasure);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('touchstart', onHold);
      scroller.removeEventListener('touchend', onRelease);
      scroller.removeEventListener('touchcancel', onRelease);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [pinRef]);
  // The block is inert while collapsed, so its field can take focus only after the scroll back has re-opened it
  useEffect(() => {
    if (collapsed || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    ref.current.querySelector('input')?.focus({ preventScroll: true });
  }, [collapsed]);
  const reveal = useCallback(() => {
    focusOnOpen.current = true;
    ref.current.closest('.content').scrollTo({ top: 0, behavior: behavior() });
  }, []);
  return [ref, collapsed, reveal];
}
