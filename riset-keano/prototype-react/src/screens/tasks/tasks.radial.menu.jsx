// Kanban move menu (tasks.radial): the four statuses around a ring over the dimmed phone. The ring's arc points where
// the finger slides and the status it aims at fills with its colour; the task's own status is marked Now and is off.
import { createPortal } from 'react-dom';
import { D } from '../../data/sample';
import { COLUMNS } from './tasks.columns';

const ICON = 18;
const RING_R = 18, RING_C = 2 * Math.PI * RING_R;   // inner ring radius and circumference, svg units
const TONE = Object.fromEntries(COLUMNS.map(([status, , tone]) => [status, tone]));

/** The open move menu (menu from useMoveMenu, or null); onPick(status) moves its task, onClose shuts it. */
export function MoveMenu({ menu, onPick, onClose }) {
  if (!menu) return null;
  const t = D.task(menu.no);
  return createPortal(
    <div className={`tk-radial${menu.sticky ? ' is-sticky' : ''}`} role="dialog" aria-label={`Move #${t.no} ${t.title}`}>
      <button type="button" className="tk-radial-dim" aria-label="Close" onClick={onClose} />
      <div className="tk-radial-wheel" style={{ left: menu.x, top: menu.y }}>
        <svg className={`tk-radial-ring${menu.aim ? ` tk-tone-${TONE[menu.aim]}` : ''}`} viewBox="0 0 48 48" aria-hidden="true">
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
              className={`tk-radial-opt tk-radial-${side} tk-tone-${tone}${menu.aim === status ? ' is-aimed' : ''}`}>
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
