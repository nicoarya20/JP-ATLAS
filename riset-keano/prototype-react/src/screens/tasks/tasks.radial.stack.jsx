// Kanban move menu, group move (tasks.radial): the selected cards fly from where they sit on the board to the finger
// and stack under it as mini cards with the full title, the held card on top, with a count badge; their places on the
// board stay empty meanwhile (tasks.board). Moved, the stack flies off toward the status picked; cancelled, each card
// flies back to its place.
import { D } from '../../data/sample';
import { COLUMNS } from './tasks.columns';

const SIDE = Object.fromEntries(COLUMNS.map(([status, , , side]) => [status, side]));
const TILT_DEG = 4;   // each card under the top one leans this much more, alternating sides
const LIFT_PX = 3;    // ...and sits this much higher, so the stack shows its depth

/** Stack of the cards a group move carries: stack from useMoveMenu; closing with picked = moved there, without = cancelled. */
export function MoveStack({ stack, closing, picked }) {
  const leave = closing ? (picked ? ` is-to-${SIDE[picked]}` : ' is-back') : '';
  return (
    <div className={`tk-stack${leave}`} aria-hidden="true">
      {stack.map(({ no, dx, dy }, i) => (
        <div key={no} className="tk-stack-card" style={{ '--fx': `${dx}px`, '--fy': `${dy}px`, '--i': i,
          '--tilt': `${(i % 2 ? 1 : -1) * Math.ceil(i / 2) * TILT_DEG}deg`, '--lift': `${-i * LIFT_PX}px`, zIndex: stack.length - i }}>
          <span className="tk-stack-no">#{no}</span>
          <span className="tk-stack-title bold">{D.task(no).title}</span>
        </div>
      ))}
      <span className="tk-stack-count t-caption">{stack.length}</span>
    </div>
  );
}
