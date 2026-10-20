// Tasks ③ Kanban: one column per status, compact cards that open the task (its actions live in the detail);
// hold a card to open the move menu and slide (or tap) to a status (tasks.radial). A Member moves only their own
// tasks; a PM or Admin moves any.
import { useRef } from 'react';
import { Calendar, Flag, ListChecks, Plus } from 'lucide-react';
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

/** Checklist progress "2/3" from the task detail, or null when the task has no steps. */
function steps(no) {
  const list = D.taskDetail[no]?.steps || [];
  return list.length ? `${list.filter(([, done]) => done).length}/${list.length}` : null;
}

/** Card: title, #number with project (mine) or type, then chips for assignee, due date, priority and steps. */
function BoardCard({ t, mine }) {
  const late = t.status !== 'Done' && days(t.due) < 0, s = steps(t.no);
  return (
    <Section go={detailOf(t)} task={t.no} className="tk-kcard" data-no={t.no} aria-label={`#${t.no} ${t.title}`}>
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

/** ③ Kanban — one status column per screen width, the next column peeks; swipe to move, hold a card to move it.
 *  params.mine = my tasks across projects (card shows the project), otherwise every Atlas task; both narrowed and
 *  ordered by the Filter & sort query in params (All active keeps the Done column). */
export function TasksBoard({ params }) {
  const mine = !!params?.mine;
  const { toast, is } = useApp();
  const board = useRef(null);
  useTaskMoves();
  const move = useMoveMenu(board, {
    onPick: (no, status) => { moveTask(no, status); toast(`Moved to ${status}`); },
    canOpen: no => !is('member') || assigned(D.task(no), D.me().name),
    onDenied: no => toast(`Only ${assignees(D.task(no)).join(' or ')} can change this task`),
  });
  const tasks = applyQuery(mine ? D.tasks.filter(t => assigned(t, D.me().name)) : D.tasks, queryOf(params, mine), true);
  return (
    <ListScreen mine={mine} board>
      <div className="tk-board" ref={board} {...move.handlers}>
        {COLUMNS.map(([status, Icon, tone]) => {
          const list = tasks.filter(t => t.status === status);
          return (
            <section key={status} className="tk-col" data-status={status} aria-label={`${status}, ${list.length} tasks`}>
              <h3 className="tk-col-head">
                <span className={`tk-badge tk-tone-${tone} t-caption`}><Icon size={ICON} aria-hidden="true" />{status}</span>
                <span className="t-footnote muted">{list.length}</span>
              </h3>
              {list.map(t => <BoardCard key={t.no} t={t} mine={mine} />)}
              <div><Btn kind="plain" sm icon={<Plus size={16} aria-hidden="true" />} go="tasks.form">Add task</Btn></div>
            </section>
          );
        })}
      </div>
      <MoveMenu menu={move.menu} picked={move.picked} onPick={move.pick} onClose={move.close} />
    </ListScreen>
  );
}
