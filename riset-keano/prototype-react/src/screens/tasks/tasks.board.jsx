// Tasks ③ Kanban: one column per status, compact cards that open the task (its actions live in the detail);
// hold a card to open the move menu and slide (or tap) to a status (tasks.radial). Select turns taps into picking
// cards; holding one picked card then moves them all at once. A Member moves (and picks) only their own tasks; a PM
// or Admin moves any.
import { useRef, useState } from 'react';
import { Calendar, Circle, CircleCheck, Flag, ListChecks, Plus } from 'lucide-react';
import { Avatars, Btn, Section } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { COLUMNS } from './tasks.columns';
import { ListScreen } from './tasks.list';
import { applyQuery, queryOf } from './tasks.query';
import { assigned, assignees, days, detailOf } from './tasks.shared';
import { useMoveMenu } from './tasks.radial';
import { MoveMenu } from './tasks.radial.menu';
import { moveTask, useTaskMoves } from './tasks.store';

const ICON = 14;
const tasksOf = n => `${n} task${n === 1 ? '' : 's'}`;

/** Checklist progress "2/3" from the task detail, or null when the task has no steps. */
function steps(no) {
  const list = D.taskDetail[no]?.steps || [];
  return list.length ? `${list.filter(([, done]) => done).length}/${list.length}` : null;
}

/**
 * Card: title, #number with project (mine) or type, then chips for assignee, due date, priority and steps. Tapping
 * opens the task, or with select = { on, toggle } picks it (a tick in the corner); lifted = it is in the move stack.
 */
function BoardCard({ t, mine, select, lifted }) {
  const late = t.status !== 'Done' && days(t.due) < 0, s = steps(t.no);
  const tap = select ? { onClick: select.toggle, role: 'button', interactive: true, 'aria-pressed': select.on } : { go: detailOf(t), task: t.no };
  const cls = `tk-kcard${select?.on ? ' is-selected' : ''}${lifted ? ' is-lifted' : ''}`;
  return (
    <Section {...tap} className={cls} data-no={t.no} aria-label={`#${t.no} ${t.title}`}>
      {select && <span className="tk-kcheck" aria-hidden="true">{select.on ? <CircleCheck size={20} /> : <Circle size={20} />}</span>}
      <div className="stack xs">
        <span className="t-subhead bold">{t.title}</span>
        <span className="t-footnote muted">#{t.no} · {mine ? t.project : t.type}</span>
        <div className="tk-chips t-footnote">
          <span className="tk-chip" title={assignees(t).map(n => D.person(n)?.full || n).join(', ')}><Avatars names={assignees(t)} /></span>
          <span className={`tk-chip${late ? ' danger' : ''}`}><Calendar size={ICON} aria-hidden="true" />{t.due}</span>
          <span className={`tk-chip tk-prio-${t.priority.toLowerCase()}`}><Flag size={ICON} aria-hidden="true" />{t.priority}</span>
          {s && <span className="tk-chip"><ListChecks size={ICON} aria-hidden="true" />{s}</span>}
        </div>
      </div>
    </Section>
  );
}

/** Bar above the board: Select starts picking cards (with how many are picked), Cancel ends it. */
function SelectBar({ on, count, onToggle }) {
  const note = !on ? '' : count ? `${count} selected · hold one to move them` : 'Tap tasks to select them';
  return (
    <div className="tk-selbar">
      <span className="t-footnote muted" aria-live="polite">{note}</span>
      <Btn kind="plain" sm onClick={onToggle}>{on ? 'Cancel' : 'Select'}</Btn>
    </div>
  );
}

/** ③ Kanban — one status column per screen width, the next column peeks; swipe to move, hold a card to move it.
 *  params.mine = my tasks across projects (card shows the project), otherwise every Atlas task; both narrowed and
 *  ordered by the Filter & sort query in params (All active keeps the Done column). */
export function TasksBoard({ params }) {
  const mine = !!params?.mine;
  const { toast, is } = useApp();
  const board = useRef(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  useTaskMoves();
  const tasks = applyQuery(mine ? D.tasks.filter(t => assigned(t, D.me().name)) : D.tasks, queryOf(params, mine), true);
  const chosen = tasks.filter(t => picked.has(t.no)).map(t => t.no);   // picked and still on the board

  const mayChange = no => !is('member') || assigned(D.task(no), D.me().name);
  const deny = no => toast(`Only ${assignees(D.task(no)).join(' or ')} can change this task`);
  const endSelect = () => { setSelecting(false); setPicked(new Set()); };
  const toggle = no => {
    if (!mayChange(no)) { deny(no); return; }
    setPicked(old => { const next = new Set(old); if (!next.delete(no)) next.add(no); return next; });
  };
  const move = useMoveMenu(board, {
    onPick: (nos, status) => {
      const moving = nos.filter(no => D.task(no).status !== status);
      moving.forEach(no => moveTask(no, status));
      if (nos.length === 1) { toast(`Moved to ${status}`); return; }
      toast(`Moved ${tasksOf(moving.length)} to ${status}`);
      endSelect();
    },
    canOpen: mayChange,
    onDenied: deny,
    groupOf: no => (picked.has(no) && chosen.length > 1 ? [no, ...chosen.filter(n => n !== no)] : [no]),
  });
  const lifted = move.menu?.stack ? new Set(move.menu.nos) : null;
  return (
    <ListScreen mine={mine} board>
      <SelectBar on={selecting} count={chosen.length} onToggle={selecting ? endSelect : () => setSelecting(true)} />
      <div className="tk-board" ref={board} {...move.handlers}>
        {COLUMNS.map(([status, Icon, tone]) => {
          const list = tasks.filter(t => t.status === status);
          return (
            <section key={status} className="tk-col" data-status={status} aria-label={`${status}, ${list.length} tasks`}>
              <h3 className="tk-col-head">
                <span className={`tk-badge tk-tone-${tone} t-caption`}><Icon size={ICON} aria-hidden="true" />{status}</span>
                <span className="t-footnote muted">{list.length}</span>
              </h3>
              {list.map(t => (
                <BoardCard key={t.no} t={t} mine={mine} lifted={lifted?.has(t.no)}
                  select={selecting ? { on: picked.has(t.no), toggle: () => toggle(t.no) } : undefined} />
              ))}
              <div><Btn kind="plain" sm icon={<Plus size={16} aria-hidden="true" />} go="tasks.form">Add task</Btn></div>
            </section>
          );
        })}
      </div>
      <MoveMenu menu={move.menu} picked={move.picked} onPick={move.pick} onClose={move.close} />
    </ListScreen>
  );
}
