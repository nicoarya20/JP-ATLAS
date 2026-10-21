// Home header collapse: as the content sheet scrolls up it pushes the search bar away; the bar fades and shrinks while the
// search icon beside the avatar fades in (see .hm-find and .hm-find-ico in home.css).
import { useEffect, useRef, useState } from 'react';

/** Collapse at or past this share of the search block's height: from here the icon, not the bar, can be tapped and focused. */
const COLLAPSED_AT = 0.5;

/**
 * Tracks how far the Home content has scrolled over the search block (0 = shown, 1 = gone) and writes it to --hm-p on the
 * screen so CSS drives the fade and shrink without re-rendering. Returns [ref for the search block, collapsed].
 */
export function useSearchCollapse() {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const block = ref.current;
    const scroller = block.closest('.content');
    const screen = block.closest('.scr');
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, scroller.scrollTop / (block.offsetHeight || 1)));
      screen.style.setProperty('--hm-p', p.toFixed(3));
      setCollapsed(p >= COLLAPSED_AT);
    };
    // One update per frame: scroll fires faster than the screen paints
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return [ref, collapsed];
}
