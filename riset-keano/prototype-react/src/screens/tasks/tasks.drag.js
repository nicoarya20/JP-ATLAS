// Kanban drag and drop: hold a card (touch) or drag it (mouse) to lift it, carry it over another status column and
// let go to move the task there; Escape puts it back. A card the viewer may not move never lifts (canLift). A ghost copy follows the finger above the phone; the column under it is outlined;
// near the board's left or right edge the board scrolls on to the next column. A swipe that starts on a card still
// scrolls the board, because a finger only lifts the card after holding still.
import { useEffect, useRef } from 'react';

const HOLD_MS = 350;         // touch: hold this long before the card lifts
const SLOP_PX = 8;           // ...a finger that travels this far first is a scroll, not a drag
const MOUSE_START_PX = 6;    // mouse: travel before a press becomes a drag (a click still opens the card)
const EDGE_PX = 48;          // finger this close to a board edge scrolls the board...
const EDGE_SPEED = 12;       // ...by up to this many px per frame
const HAPTIC_MS = 10;        // short buzz on lift where the browser supports it

/**
 * Drag handlers for the board around boardRef. Cards are `.tk-kcard[data-no]` inside `.tk-col[data-status]`.
 * onDrop(no, status) runs when a card is let go over a column of another status; canLift(no) = false keeps the card
 * in place and runs onDenied(no) instead.
 */
export function useBoardDrag(boardRef, { onDrop, canLift = () => true, onDenied = () => {} }) {
  const drag = useRef(null);
  const swallowClick = useRef(false);
  const cb = useRef(null);
  cb.current = { onDrop, canLift, onDenied };

  const columnAt = x => [...boardRef.current.querySelectorAll('.tk-col')].find(c => {
    const r = c.getBoundingClientRect();
    return x >= r.left && x < r.right;
  }) || null;

  const place = d => {
    const host = d.host.getBoundingClientRect();
    d.ghost.style.transform = `translate(${d.x - d.grab.x - host.left}px, ${d.y - d.grab.y - host.top}px)`;
  };

  const target = d => {
    const col = columnAt(d.x);
    const over = col && col.dataset.status !== d.from ? col : null;
    if (over === d.over) return;
    d.over?.classList.remove('is-over');
    over?.classList.add('is-over');
    d.over = over;
  };

  // Per frame while lifted: scroll the board when the finger rests near an edge, then re-check the column under it.
  const tick = () => {
    const d = drag.current;
    if (!d?.on) return;
    const board = boardRef.current, r = board.getBoundingClientRect();
    const left = r.left + EDGE_PX - d.x, right = d.x - (r.right - EDGE_PX);
    if (left > 0) board.scrollLeft -= EDGE_SPEED * Math.min(1, left / EDGE_PX);
    else if (right > 0) board.scrollLeft += EDGE_SPEED * Math.min(1, right / EDGE_PX);
    target(d);
    d.raf = requestAnimationFrame(tick);
  };

  const lift = d => {
    if (!cb.current.canLift(d.no)) {
      finish(false);
      swallowClick.current = true;   // the try to drag it is not a tap that opens it
      cb.current.onDenied(d.no);
      return;
    }
    const board = boardRef.current, rect = d.card.getBoundingClientRect();
    d.host = board.closest('.phone-app') || document.body;
    d.grab = { x: d.x - rect.left, y: d.y - rect.top };
    d.ghost = d.card.cloneNode(true);
    d.ghost.classList.add('tk-ghost');
    d.ghost.removeAttribute('role');
    d.ghost.setAttribute('aria-hidden', 'true');
    d.ghost.style.width = `${rect.width}px`;
    d.host.appendChild(d.ghost);
    d.card.classList.add('is-lifted');
    board.classList.add('is-dragging');
    board.setPointerCapture?.(d.id);
    navigator.vibrate?.(HAPTIC_MS);
    d.onKey = e => { if (e.key === 'Escape') finish(false); };
    window.addEventListener('keydown', d.onKey);
    d.on = true;
    place(d);
    target(d);
    d.raf = requestAnimationFrame(tick);
  };

  /** End the drag; drop = true moves the task when it is over another column. */
  const finish = drop => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    clearTimeout(d.timer);
    if (!d.on) return;
    cancelAnimationFrame(d.raf);
    window.removeEventListener('keydown', d.onKey);
    d.ghost.remove();
    d.card.classList.remove('is-lifted');
    d.over?.classList.remove('is-over');
    boardRef.current?.classList.remove('is-dragging');
    if (drop && d.over) cb.current.onDrop(d.no, d.over.dataset.status);
  };

  // A lifted card owns the finger: keep the board and page from panning under it (needs a non-passive listener).
  useEffect(() => {
    const el = boardRef.current;
    const block = e => { if (drag.current?.on) e.preventDefault(); };
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchmove', block);
      finish(false);
    };
  }, [boardRef]);   // finish only reads refs

  const onPointerDown = e => {
    swallowClick.current = false;
    const card = e.button === 0 && e.isPrimary !== false && e.target.closest('.tk-kcard[data-no]');
    if (!card || drag.current) return;
    const d = { id: e.pointerId, card, no: +card.dataset.no, from: card.closest('.tk-col').dataset.status,
      touch: e.pointerType !== 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, over: null };
    if (d.touch) d.timer = setTimeout(() => lift(d), HOLD_MS);
    drag.current = d;
  };

  const onPointerMove = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.on) {
      const moved = Math.hypot(d.x - d.x0, d.y - d.y0);
      if (d.touch && moved > SLOP_PX) finish(false);      // it is a swipe: let the board scroll
      else if (!d.touch && moved > MOUSE_START_PX) lift(d);
      return;
    }
    place(d);
    target(d);
  };

  const onPointerUp = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (d.on) swallowClick.current = true;   // letting go of a lifted card is not a tap that opens it
    finish(true);
  };

  const onPointerCancel = () => finish(false);

  // Android opens a context menu on a long press; the hold is ours.
  const onContextMenu = e => { if (drag.current) e.preventDefault(); };

  const onClickCapture = e => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu, onClickCapture };
}
