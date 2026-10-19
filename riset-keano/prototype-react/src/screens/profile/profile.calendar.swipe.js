// My calendar: page the week strip by dragging it sideways, as in iOS Calendar. The three-week track (last, this,
// next) follows the finger; a long enough drag or a flick glides on to the next page, anything shorter springs back.
import { useLayoutEffect, useRef } from 'react';

const START_PX = 6;          // finger travel before a press becomes a drag (taps on a day still work)
const PAGE_SHARE = 0.25;     // released past a quarter of the strip width: page
const PAGE_MIN_PX = 40;      // ...and never on less travel than this
const FLICK_PX_MS = 0.4;     // or flicked faster than this...
const FLICK_MIN_PX = 16;     // ...after at least this much travel
const STALE_MS = 100;        // a finger that stopped this long before release is not a flick

/**
 * Drag handlers for the strip around trackRef. Writes --wk-drag (px) on the track; CSS turns it into motion.
 * onPage(+1 | -1) moves a week; pageKey (the shown week) changing tells the hook the new week is rendered.
 */
export function useWeekSwipe(trackRef, pageKey, onPage) {
  const drag = useRef(null);
  const carry = useRef(null);       // where the new week starts after a page, so it keeps moving from the finger
  const swallowClick = useRef(false);
  const paint = px => trackRef.current.style.setProperty('--wk-drag', `${px}px`);

  // The track now centres the new week, so it would jump; start it at the old spot and let the transition glide it in.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (carry.current == null || !el) return;
    el.classList.add('is-dragging');
    paint(carry.current);
    carry.current = null;
    el.getBoundingClientRect();     // commit the start offset before the transition takes over
    el.classList.remove('is-dragging');
    paint(0);
  }, [pageKey]);   // once per new week; the refs it reads never change

  const onPointerDown = e => {
    swallowClick.current = false;
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t: e.timeStamp, v: 0, px: 0, on: false };
  };
  const onPointerMove = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.on) {
      if (Math.abs(dx) < START_PX) return;
      if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) { drag.current = null; return; }   // a vertical move is not a page
      d.on = true;
      trackRef.current.setPointerCapture?.(e.pointerId);
      trackRef.current.classList.add('is-dragging');
    }
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = 0.8 * ((e.clientX - d.x) / dt) + 0.2 * d.v;
    d.x = e.clientX;
    d.t = e.timeStamp;
    d.px = dx;
    paint(dx);
  };
  const onPointerUp = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.on) return;
    swallowClick.current = true;   // the press that ended a drag is not a tap on the day it started on
    const el = trackRef.current;
    const width = el.parentElement.offsetWidth;
    const v = e.timeStamp - d.t > STALE_MS ? 0 : d.v;
    const far = Math.abs(d.px) > Math.max(width * PAGE_SHARE, PAGE_MIN_PX);
    const flick = Math.abs(v) > FLICK_PX_MS && Math.abs(d.px) > FLICK_MIN_PX && Math.sign(v) === Math.sign(d.px);
    el.classList.remove('is-dragging');
    if (!far && !flick) { paint(0); return; }
    const step = d.px < 0 ? 1 : -1;
    carry.current = d.px + step * width;
    onPage(step);
  };
  const onPointerCancel = () => {
    if (drag.current?.on) {
      trackRef.current.classList.remove('is-dragging');
      paint(0);
    }
    drag.current = null;
  };
  const onClickCapture = e => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture };
}
