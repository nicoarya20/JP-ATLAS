// Full-height overlay sheet (iOS page sheet): slides up over the screen below the status bar, closes with the X
// in its top-left corner, Escape, a tap on the dim, or a swipe down. Built on Radix Dialog (focus trap, Escape, aria).
import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './fullsheet.css';

const START_PX = 6;          // finger travel before a press becomes a drag (taps on buttons inside still work)
const CLOSE_SHARE = 0.25;    // released past a quarter of the sheet height: close
const FLICK_PX_MS = 0.5;     // or flicked down faster than this...
const FLICK_MIN_PX = 40;     // ...after at least this much travel
const STALE_MS = 100;        // a finger that stopped this long before release is not a flick
const UP_RESIST = 0.2;       // dragging up only stretches the sheet a little

/**
 * Swipe-down-to-close on the drag zones ([data-sheet-drag]: the grabber bar and whatever the content marks).
 * Writes --fs-drag (px) on the sheet and --fs-progress (0..1) on the dim; CSS turns both into motion.
 */
function useSwipeDown(sheetRef, dimRef, onClose) {
  const drag = useRef(null);
  const swallowClick = useRef(false);

  const paint = px => {
    const h = sheetRef.current.offsetHeight || window.innerHeight;
    sheetRef.current.style.setProperty('--fs-drag', `${px}px`);
    dimRef.current?.style.setProperty('--fs-progress', String(Math.min(Math.max(px / h, 0), 1)));
  };
  const settle = () => {
    sheetRef.current.classList.remove('is-dragging');
    paint(0);
  };

  const onPointerDown = e => {
    swallowClick.current = false;
    if (e.button !== 0 || !e.target.closest?.('[data-sheet-drag]')) return;
    drag.current = { id: e.pointerId, y0: e.clientY, y: e.clientY, t: e.timeStamp, v: 0, px: 0, on: false };
  };
  const onPointerMove = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.abs(dy) < START_PX) return;
      d.on = true;
      sheetRef.current.setPointerCapture?.(e.pointerId);
      sheetRef.current.classList.add('is-dragging');
    }
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = 0.8 * ((e.clientY - d.y) / dt) + 0.2 * d.v;
    d.y = e.clientY;
    d.t = e.timeStamp;
    d.px = dy > 0 ? dy : dy * UP_RESIST;
    paint(d.px);
  };
  const onPointerUp = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.on) return;
    swallowClick.current = true;   // the press that ended a drag is not a tap on what it started on
    const h = sheetRef.current.offsetHeight || window.innerHeight;
    const v = e.timeStamp - d.t > STALE_MS ? 0 : d.v;
    if (d.px > h * CLOSE_SHARE || (v > FLICK_PX_MS && d.px > FLICK_MIN_PX)) {
      sheetRef.current.classList.remove('is-dragging'); // keeps --fs-drag: the exit animation starts where the finger let go
      onClose();
    } else settle();
  };
  const onPointerCancel = () => {
    if (drag.current?.on) settle();
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

/** Escape inside an element marked [data-own-escape] (e.g. an inline editor that cancels on Escape) stays there. */
const keepOwnEscape = e => {
  if (e.target?.closest?.('[data-own-escape]')) e.preventDefault();
};

/** Full-height sheet. open; onClose(); title = accessible dialog name (visually hidden); children = scrolling body. */
export function FullSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  const dimRef = useRef(null);
  const swipe = useSwipeDown(sheetRef, dimRef, onClose);
  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay ref={dimRef} className="fs-dim" />
        <Dialog.Content ref={sheetRef} className="fs" aria-describedby={undefined} onEscapeKeyDown={keepOwnEscape} {...swipe}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="fs-bar" data-sheet-drag="">
            <span className="fs-grab" aria-hidden="true" />
            <Dialog.Close className="fs-x" aria-label="Close"><X size={20} aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="fs-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
