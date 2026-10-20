// Kanban move menu (tasks.radial): the four statuses around a ring over the dimmed phone. The ring's arc points where
// the finger slides and the status it aims at fills with its colour; the task's own status is marked Now and is off.
// On close it plays out for CLOSE_MS: the statuses fold back into the ring and the dim fades, while a picked status
// stays filled and swells away. Closing, it is already hidden from assistive tech and lets every pointer through.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { D } from '../../data/sample';
import { COLUMNS } from './tasks.columns';

const ICON = 18;
const CLOSE_MS = 180;   // the longest close animation in tasks.css (tk-radial-out)
const RING_R = 18, RING_C = 2 * Math.PI * RING_R;   // inner ring radius and circumference, svg units
const TONE = Object.fromEntries(COLUMNS.map(([status, , tone]) => [status, tone]));

/**
 * The move menu: menu and picked from useMoveMenu (menu null = closed, picked = the status it moved its task to);
 * onPick(status) moves its task, onClose shuts it.
 */
export function MoveMenu({ menu: open, picked, onPick, onClose }) {
  const [last, setLast] = useState(open);   // the menu as last open, kept on screen while it closes
  if (open && open !== last) setLast(open);
  const closing = !open && !!last;
  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => setLast(null), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  const menu = open || last;
  if (!menu) return null;
  const t = D.task(menu.no);
  const lit = closing ? picked : menu.aim;   // the filled status: aimed at while open, moved to while closing
  return createPortal(
    <div className={`tk-radial${menu.sticky ? ' is-sticky' : ''}${closing ? ' is-closing' : ''}`} role="dialog"
      aria-label={`Move #${t.no} ${t.title}`} aria-hidden={closing || undefined} inert={closing ? '' : undefined}>
      <button type="button" className="tk-radial-dim" aria-label="Close" onClick={onClose} />
      <div className="tk-radial-wheel" style={{ left: menu.x, top: menu.y }}>
        <svg className={`tk-radial-ring${lit ? ` tk-tone-${TONE[lit]}` : ''}`} viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r={RING_R} />
          {menu.angle != null && (
            <circle className="tk-radial-arc" cx="24" cy="24" r={RING_R} strokeDasharray={`${RING_C / 4} ${RING_C}`}
              style={{ rotate: `${menu.angle - 45}deg` }} />
          )}
        </svg>
        {COLUMNS.map(([status, Icon, tone, side]) => {
          const now = status === menu.from;
          return (
            <button key={status} type="button" disabled={now} aria-current={now || undefined} onClick={() => onPick(status)}
              className={`tk-radial-opt tk-radial-${side} tk-tone-${tone}${lit === status ? ' is-aimed' : ''}`}>
              <Icon size={ICON} aria-hidden="true" />{status}
              {now && <>{' '}<span className="tk-radial-now t-caption">Now</span></>}
            </button>
          );
        })}
      </div>
      <p className="tk-radial-hint">
        <span className="t-subhead bold">#{t.no} {t.title}</span>
        <span className="t-footnote muted">{menu.sticky ? 'Tap a status to move the task' : 'Slide to a status and let go'}</span>
      </p>
    </div>,
    menu.host,
  );
}
