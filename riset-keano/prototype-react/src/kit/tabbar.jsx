// Liquid-glass tab pill: a bubble sits behind the active icon, springs to a tapped tab with a jelly bounce,
// and while a finger is down it jumps under the finger and follows it left and right; release picks the nearest tab.
// The bar must stay mounted across screens (PhoneApp hosts it) so every move is a CSS transition from where it is drawn.
import { useEffect, useRef, useState } from 'react';
import './tabbar.css';

const PAD = 4;   // px between the pill edge and the bubble (matches .tb padding)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Bubble position (fractional tab index) whose centre is at clientX, or `fallback` when the pill has no layout (tests). */
function posAt(nav, clientX, n, fallback) {
  const r = nav.getBoundingClientRect();
  if (!r.width) return fallback;
  return clamp((clientX - r.left - PAD) / ((r.width - 2 * PAD) / n) - 0.5, 0, n - 1);
}

/**
 * Icon tabs with a draggable bubble. items = [{id, label, icon}]; activeId = selected id; onChange(id) on a new pick.
 * Labels stay for screen readers; arrow keys move between tabs.
 */
export function GlassTabs({ items, activeId, onChange, className = '' }) {
  const nav = useRef(null);
  const n = items.length;
  const active = Math.max(0, items.findIndex(t => t.id === activeId));
  const [held, setHeld] = useState(null);   // {pos, moved} while a finger is down
  // 0 = still, 1/2 = jelly bounce running; flipping between two identical keyframes restarts a bounce already running.
  const [bounce, setBounce] = useState(0);
  const wobble = () => setBounce(b => (b === 1 ? 2 : 1));

  // Bounce on every tab change, whichever screen or link caused it (not on the first mount).
  const shown = useRef(active);
  useEffect(() => {
    if (shown.current === active) return;
    shown.current = active;
    wobble();
  }, [active]);

  const release = (pos, pick) => {
    setHeld(null);
    if (pick !== active) onChange(items[pick].id);
    else wobble();                                       // same tab: bounce in place, no navigation
  };

  const down = e => {
    if (e.button > 0) return;
    const i = Number(e.target.closest('[data-i]')?.dataset.i ?? active);
    nav.current.setPointerCapture?.(e.pointerId);
    setHeld({ pos: posAt(nav.current, e.clientX, n, i), moved: false });
  };
  const move = e => held && setHeld({ pos: posAt(nav.current, e.clientX, n, held.pos), moved: true });
  const up = () => held && release(held.pos, Math.round(held.pos));
  const cancel = () => held && release(held.pos, active);
  const key = e => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    release(active, (active + step + n) % n);
  };

  const lit = held ? Math.round(held.pos) : active;
  const bubble = ['tb-bubble', held && 'is-held', held?.moved && 'is-dragging', bounce && `is-settling is-bounce-${bounce}`]
    .filter(Boolean).join(' ');
  return (
    <nav ref={nav} role="tablist" aria-label="App navigation" className={`tb ${className}`.trim()} style={{ '--tb-n': n }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onKeyDown={key}>
      <span className={bubble} aria-hidden="true" onAnimationEnd={() => setBounce(0)}
        style={{ '--tb-pos': held ? held.pos : active }} />
      {items.map((t, i) => (
        <button key={t.id} type="button" role="tab" data-i={i} aria-selected={i === active} tabIndex={i === active ? 0 : -1}
          className={`tb-item${i === lit ? ' on' : ''}`}
          onClick={e => { if (e.detail === 0) release(active, i); }}>{/* pointer taps go through down/up; this is Enter/Space */}
          <span className="tb-ico" aria-hidden="true">{t.icon}</span>
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
