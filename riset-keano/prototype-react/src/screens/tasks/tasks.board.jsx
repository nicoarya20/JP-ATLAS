// Tasks ③ Kanban: one column per status, compact cards that only open the task (its actions live in the detail).
import { Ban, Calendar, Circle, CircleCheck, CircleDashed, CircleDot, Flag, ListChecks, Plus } from 'lucide-react';
import { Avatar, Btn, Section } from '../../kit';
import { D } from '../../data/sample';
import { ListScreen } from './tasks.list';
import { applyQuery, queryOf } from './tasks.query';
import { blocked, days, detailOf } from './tasks.shared';

// Status badge per column: icon + tone class (colour comes from tasks.css).
const COLUMNS = [
  ['To do', CircleDashed, 'todo'],
  ['In progress', CircleDot, 'progress'],
  ['In review', Circle, 'review'],
  ['Done', CircleCheck, 'done'],
];
const ICON = 14;

/** Checklist progress "2/3" from the task detail, or null when the task has no steps. */
function steps(no) {
  const list = D.taskDetail[no]?.steps || [];
  return list.length ? `${list.filter(([, done]) => done).length}/${list.length}` : null;
}

/** Card: title, #number with project (mine) or type, then chips for assignee, due date, priority, blocked and steps. */
function BoardCard({ t, mine }) {
  const late = t.status !== 'Done' && days(t.due) < 0, s = steps(t.no);
  return (
    <Section go={detailOf(t)} task={t.no} className="tk-kcard" aria-label={`#${t.no} ${t.title}`}>
      <div className="stack xs">
        <span className="t-subhead bold">{t.title}</span>
        <span className="t-footnote muted">#{t.no} · {mine ? t.project : t.type}</span>
        <div className="tk-chips t-footnote">
          <span className="tk-chip" title={D.person(t.who)?.full || t.who}><Avatar name={t.who} size="sm" /></span>
          <span className={`tk-chip${late ? ' danger' : ''}`}><Calendar size={ICON} aria-hidden="true" />{t.due}</span>
          <span className={`tk-chip tk-prio-${t.priority.toLowerCase()}`}><Flag size={ICON} aria-hidden="true" />{t.priority}</span>
          {blocked(t) && <span className="tk-chip danger"><Ban size={ICON} aria-hidden="true" />{t.when.replace('Blocked by ', 'Blocked ')}</span>}
          {s && <span className="tk-chip"><ListChecks size={ICON} aria-hidden="true" />{s}</span>}
        </div>
      </div>
    </Section>
  );
}

/** ③ Kanban — one status column per screen width, the next column peeks; swipe to move.
 *  params.mine = my tasks across projects (card shows the project), otherwise every Atlas task; both narrowed and
 *  ordered by the Filter & sort query in params (All active keeps the Done column). */
export function TasksBoard({ params }) {
  const mine = !!params?.mine;
  const tasks = applyQuery(mine ? D.tasks.filter(t => t.who === D.me().name) : D.tasks, queryOf(params, mine), true);
  return (
    <ListScreen mine={mine} board>
      <div className="tk-board">
        {COLUMNS.map(([status, Icon, tone]) => {
          const list = tasks.filter(t => t.status === status);
          return (
            <section key={status} className="tk-col" aria-label={`${status}, ${list.length} tasks`}>
              <h3 className="tk-col-head">
                <span className={`tk-badge tk-tone-${tone} t-caption`}><Icon size={ICON} aria-hidden="true" />{status}</span>
                <span className="t-footnote muted">{list.length}</span>
              </h3>
              {list.map(t => <BoardCard key={t.no} t={t} mine={mine} />)}
              {!list.length && <p className="t-footnote muted tk-col-empty">No tasks</p>}
              <div><Btn kind="plain" sm icon={<Plus size={16} aria-hidden="true" />} go="tasks.form">Add task</Btn></div>
            </section>
          );
        })}
      </div>
    </ListScreen>
  );
}
