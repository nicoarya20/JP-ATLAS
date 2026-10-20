// Kanban move menu gesture: hold a card to open a radial menu of the four statuses, then either slide toward one and
// let go (quick), or let go without sliding and tap one (the menu stays open). Sliding out and back to the middle
// before letting go cancels; Escape or a tap on the dim closes it. A swipe that starts on a card still scrolls the
// board, because the menu only opens after the finger holds still. A card the viewer may not move never opens it.
import { useEffect, useRef, useState } from 'react';
import { COLUMNS } from './tasks.columns';

const HOLD_MS = 350;      // hold this long before the menu opens (touch and mouse)
const SLOP_PX = 8;        // ...a pointer that travels this far first is a scroll, not a hold
const PICK_PX = 28;       // slide at least this far from where the hold started to aim at a status
const HAPTIC_MS = 10;     // short buzz on open and on each new aim, where the browser supports it
// Keep the menu's centre this far from the phone's sides, top and bottom so every option and the hint stay on screen.
const EDGE = { x: 164, top: 140, bottom: 200 };

const SIDE = Object.fromEntries(COLUMNS.map(([status, , , side]) => [side, status]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

/** Status a slide of (dx, dy) px from the hold point aims at: the side of its longer axis, or null while still short. */
export function aimOf(dx, dy) {
  if (Math.hypot(dx, dy) < PICK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? SIDE[dx > 0 ? 'right' : 'left'] : SIDE[dy > 0 ? 'down' : 'up'];
}

/**
 * Move-menu handlers for the board around boardRef (cards are `.tk-kcard[data-no]` in `.tk-col[data-status]`).
 * Returns { handlers, menu, pick, close }: spread handlers on the board and render <MoveMenu> from menu, which is
 * { no, from, host, x, y, aim, angle, sticky } while open, else null. onPick(no, status) runs for a status other than
 * the task's own; canOpen(no) = false keeps the menu shut and runs onDenied(no) instead.
 */
export function useMoveMenu(boardRef, { onPick, canOpen = () => true, onDenied = () => {} }) {
  const [menu, setMenu] = useState(null);
  const live = useRef(null);          // the menu as of the last event (handlers can run twice between renders)
  const hold = useRef(null);          // the press in progress
  const swallowClick = useRef(false);
  const cb = useRef(null);
  cb.current = { onPick, canOpen, onDenied };
  const show = m => { live.current = m; setMenu(m); };

  const close = () => {
    if (hold.current?.open) swallowClick.current = true;   // closed mid-hold (Escape): letting go is still not a tap
    clearTimeout(hold.current?.timer);
    hold.current = null;
    show(null);
  };

  /** Move the menu's task to status and close; its own status (or none) only closes. */
  const pick = status => {
    const m = live.current;
    close();
    if (m && status && status !== m.from) cb.current.onPick(m.no, status);
  };

  const open = h => {
    if (!cb.current.canOpen(h.no)) {
      hold.current = null;
      swallowClick.current = true;   // the hold is not a tap that opens the task
      cb.current.onDenied(h.no);
      return;
    }
    const board = boardRef.current, host = board.closest('.phone-app') || document.body, r = host.getBoundingClientRect();
    h.open = true;
    board.setPointerCapture?.(h.id);
    navigator.vibrate?.(HAPTIC_MS);
    show({ no: h.no, from: h.from, host, aim: null, angle: null, sticky: false,
      x: clamp(h.x0 - r.left, EDGE.x, r.width - EDGE.x), y: clamp(h.y0 - r.top, EDGE.top, r.height - EDGE.bottom) });
  };

  const isOpen = !!menu;
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);   // close only touches refs and state setters

  // While the finger aims, keep the board and page from panning under it (needs a non-passive listener).
  useEffect(() => {
    const el = boardRef.current;
    const block = e => { if (hold.current?.open) e.preventDefault(); };
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchmove', block);
      clearTimeout(hold.current?.timer);
    };
  }, [boardRef]);

  const onPointerDown = e => {
    swallowClick.current = false;
    const card = e.button === 0 && e.isPrimary !== false && e.target.closest('.tk-kcard[data-no]');
    if (!card || hold.current || live.current) return;
    const h = { id: e.pointerId, no: +card.dataset.no, from: card.closest('.tk-col').dataset.status,
      x0: e.clientX, y0: e.clientY, open: false, left: false };
    h.timer = setTimeout(() => open(h), HOLD_MS);
    hold.current = h;
  };

  const onPointerMove = e => {
    const h = hold.current;
    if (!h || e.pointerId !== h.id) return;
    const dx = e.clientX - h.x0, dy = e.clientY - h.y0;
    if (!h.open) {
      if (Math.hypot(dx, dy) > SLOP_PX) close();   // a swipe: let the board scroll
      return;
    }
    const aim = aimOf(dx, dy), m = live.current;
    if (aim) h.left = true;
    if (aim && aim !== m.aim) navigator.vibrate?.(HAPTIC_MS);
    show({ ...m, aim, angle: aim ? Math.atan2(dy, dx) * 180 / Math.PI : null });
  };

  const onPointerUp = e => {
    const h = hold.current;
    if (!h || e.pointerId !== h.id) return;
    if (!h.open) { close(); return; }   // a tap: its click opens the task
    swallowClick.current = true;        // letting go after the hold is not a tap that opens the task
    const { aim } = live.current;
    if (aim) pick(aim);
    else if (h.left) close();           // slid out and came back to the middle: cancel
    else { hold.current = null; show({ ...live.current, sticky: true }); }   // never slid: stay open for a tap
  };

  const onPointerCancel = () => { if (!live.current?.sticky) close(); };

  // Android opens a context menu on a long press; the hold is ours.
  const onContextMenu = e => { if (hold.current || live.current) e.preventDefault(); };

  const onClickCapture = e => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu, onClickCapture }, menu, pick, close };
}
