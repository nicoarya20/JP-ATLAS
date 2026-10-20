// Home "My Focus" and "Agenda & Projects" from the live data: the signed-in person's open tasks (overdue, today, the
// rest of this week), tasks awaiting their review (PM), their next event and their projects. Rows open those items.
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Btn, Link, Pill, Progress, Row, Rows } from '../../kit';
import { EV, taskScreen } from '../events/events.shared';
import { useEvents } from '../events/events.store';
import { TODAY, days } from '../tasks/tasks.shared';
import { moveTask, useTaskMoves } from '../tasks/tasks.store';

/** Days from today to Sunday: the end of "This week". */
const WEEK_LEFT = 6 - (TODAY.getDay() + 6) % 7;

/** Small group label inside a card (Overdue / Today / This week). */
const Label = ({ children }) => <p className="t-footnote muted hm-label">{children}</p>;

/** Task row → its detail. Done marks it done in place; a task that needs a review (or is in one) shows its status. */
function FocusRow({ t, btn }) {
  const { toast } = useApp();
  const done = () => {
    moveTask(t.no, 'Done', { log: `${D.me().name} marked this task done` });
    toast('Task marked done');
  };
  const direct = t.status !== 'In review' && !D.taskDetail[t.no]?.reviewer;
  return (
    <Row title={`#${t.no} ${t.title}`} sub={`${t.project} · ${t.when}`} chev={false} go={taskScreen(t)} task={t.no}
      right={btn ?? (direct ? <Btn sm onClick={done}>Done</Btn> : <Pill>{t.status}</Pill>)} />
  );
}

function Group({ label, tasks }) {
  if (!tasks.length) return null;
  return (
    <>
      <Label>{label}</Label>
      <Rows plain>{tasks.map(t => <FocusRow key={t.no} t={t} />)}</Rows>
    </>
  );
}

/** "My Focus" card body: Admin first gets the users awaiting approval; a PM also gets the tasks awaiting their review. */
export function Focus({ role }) {
  useTaskMoves();
  const me = D.me().name;
  const open = D.tasks.filter(t => t.who === me && t.status !== 'Done');
  const due = t => (t.due ? days(t.due) : Infinity);
  const review = role === 'pm' ? D.tasks.filter(t => t.status === 'In review' && t.who !== me) : [];
  const groups = [['Overdue', open.filter(t => due(t) < 0)], ['Today', open.filter(t => due(t) === 0)],
    ['This week', open.filter(t => due(t) > 0 && due(t) <= WEEK_LEFT)]];
  const empty = groups.every(([, tasks]) => !tasks.length) && !review.length;
  return (
    <>
      {role === 'admin' && (
        <>
          <Label>Needs action</Label>
          <Rows plain>
            <Row title={`Approve ${D.users.counts.pending} new users`} sub="Users · Approval · Waiting 1 day" chev={false}
              go="users.approve" right={<Btn sm kind="primary" go="users.approve">Open</Btn>} />
          </Rows>
        </>
      )}
      {groups.map(([label, tasks]) => <Group key={label} label={label} tasks={tasks} />)}
      {review.length > 0 && (
        <>
          <Label>Awaiting your review</Label>
          <Rows plain>
            {review.map(t => <FocusRow key={t.no} t={t} btn={<Btn sm kind="primary" go={taskScreen(t)} task={t.no}>Review</Btn>} />)}
          </Rows>
        </>
      )}
      {empty && <p className="t-subhead muted">Nothing due this week.</p>}
      <Link go="tasks.my">{`See all tasks (${open.length})${review.length ? ` · ${review.length} awaiting review` : ''}`}</Link>
    </>
  );
}

/** "Agenda & Projects" body: the next event I attend that isn't done or canceled, then my projects that aren't done
 *  (Admin: every project that isn't done). */
export function AgendaProjects({ role }) {
  useEvents();
  const me = D.me().name;
  const next = D.events.find(e => e.attendees.includes(me) && e.status !== 'Done' && !e.canceled);
  const projects = D.projects.filter(p => p.status !== 'Done' && (role === 'admin' || p.members.includes(me)));
  return (
    <>
      <Rows plain>
        {next ? (
          <Row lead={<span className="hm-time">{next.time}</span>} title={next.title} sub={`${EV.date(next)} · ${EV.where(next)}`} {...EV.open(next)} />
        ) : <Row title="No meetings coming up" />}
      </Rows>
      <div className="between">
        <h3 className="t-subhead bold">My projects</h3>
        <Link go="projects.list" replace>See all</Link>
      </div>
      <Rows plain>
        {projects.map(p => (
          <Row key={p.id} title={p.name} go="projects.overview" params={{ project: p.id }} right={<Pill>{p.status}</Pill>} chev={false}
            sub={<span className="stack xs"><span>{`Lead ${p.lead} · Due ${p.due}`}</span><Progress value={p.progress} /></span>} />
        ))}
      </Rows>
    </>
  );
}
