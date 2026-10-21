// Stacked screen collapse: as the content sheet scrolls up it pushes the search block away; the block fades and shrinks
// while the search icon in the header fades in (see .stk-find and .stk-find-ico in stacked.css). Left halfway, it snaps
// open or shut.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Collapse at or past this share of the search block's height: from here the icon, not the bar, can be tapped and focused. */
const COLLAPSED_AT = 0.5;
/** Quiet time after the last scroll event (and with no finger down) before a half-collapsed bar snaps open or shut. */
const SNAP_IDLE_MS = 120;

const behavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * Tracks how far the content has scrolled over the search block (0 = shown, 1 = gone) and writes it to --stk-p on the
 * screen so CSS drives the fade and shrink without re-rendering. When scrolling stops part way over the block it snaps
 * like an iOS large title: back open before COLLAPSED_AT, fully shut from there.
 * Returns [ref for the search block, collapsed, reveal]; reveal scrolls back to the top and focuses the block's field
 * once it is reachable again.
 */
export function useSearchCollapse() {
  const ref = useRef(null);
  const focusOnOpen = useRef(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const block = ref.current;
    const scroller = block.closest('.content');
    const screen = block.closest('.scr');
    let frame = 0;
    let timer = 0;
    let held = false;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, scroller.scrollTop / (block.offsetHeight || 1)));
      screen.style.setProperty('--stk-p', p.toFixed(3));
      setCollapsed(p >= COLLAPSED_AT);
    };
    const snap = () => {
      timer = 0;
      const h = block.offsetHeight, top = scroller.scrollTop;
      // 1 px slack: offsetHeight is rounded, scrollTop may not be
      if (held || top < 1 || top > h - 1) return;
      scroller.scrollTo({ top: top / h < COLLAPSED_AT ? 0 : h, behavior: behavior() });
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(snap, SNAP_IDLE_MS); };
    // One update per frame: scroll fires faster than the screen paints
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); later(); };
    // A finger resting on the screen stops scroll events without letting go: wait for the release before snapping
    const onHold = () => { held = true; };
    const onRelease = () => { held = false; later(); };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('touchstart', onHold, { passive: true });
    scroller.addEventListener('touchend', onRelease);
    scroller.addEventListener('touchcancel', onRelease);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('touchstart', onHold);
      scroller.removeEventListener('touchend', onRelease);
      scroller.removeEventListener('touchcancel', onRelease);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
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
