// Home per role (Penpot Home · Member / PM / Admin): stat chips, My Focus rows and list lengths change; layout stays.
import { CircleCheck, Clock, FolderOpen, Hourglass, TriangleAlert, UserCheck } from 'lucide-react';
import { D } from '../../data/sample';
import { Btn, Link, Row, Rows } from '../../kit';

const ICON = 15;
const STAT_GO = { tasks: 'tasks.all', projects: 'projects.list', users: 'users.approve' };
const STAT_ICON = {
  Assigned: <UserCheck size={ICON} />, 'In Progress': <Clock size={ICON} />, Completed: <CircleCheck size={ICON} />,
  Active: <FolderOpen size={ICON} />, Overdue: <TriangleAlert size={ICON} />, Awaiting: <Hourglass size={ICON} />,
};

/** Stat chip: {label, count, go, sub, icon}. sub defaults to the unit ("tasks"). Member counts are Dodi's own tasks. */
const stat = (label, count, unit, sub = unit) => ({ label, count, sub, go: STAT_GO[unit], icon: STAT_ICON[label] });

/** Per role: stat chips, number of Ask Data questions, completed-this-week rows, activity rows. */
export function roleHome(role) {
  const H = D.home;
  const R = {
    member: { stats: [stat('Assigned', 3, 'tasks', '0 overdue'), stat('In Progress', 2, 'tasks'), stat('Completed', 5, 'tasks')], asks: 2, done: 2, activity: 1 },
    pm: { stats: [stat('Assigned', H.stats.assigned, 'tasks', '0 overdue'), stat('In Progress', H.stats.inProgress, 'tasks'), stat('Completed', H.stats.completed, 'tasks')], asks: 3, done: 4, activity: 3 },
    admin: { stats: [stat('Active', D.projects.filter(p => p.status === 'Active').length, 'projects'), stat('Overdue', 3, 'tasks'), stat('Awaiting', D.users.counts.pending, 'users')], asks: 3, done: 4, activity: 3 },
  };
  return R[role];
}

/** Focus rows are Nico's Home sample (not D.tasks), so they open the sample task detail. */
function FocusRow({ t, btn, ...nav }) {
  return (
    <Row title={t.title} sub={t.meta} chev={false} go="tasks.detail-progress" {...nav}
      right={btn ?? <Btn sm toast="Task marked done">Done</Btn>} />
  );
}

/** Small group label inside a card (Overdue / Today / This week). */
const Label = ({ children }) => <p className="t-footnote muted hm-label">{children}</p>;

const ALL_TASKS = 'See all tasks (9)';

/** "My Focus" card body for the role. */
export function Focus({ role }) {
  const F = D.home.focus;
  if (role === 'admin') {
    return (
      <>
        <Label>Needs action</Label>
        <Rows plain>
          <Row title={`Approve ${D.users.counts.pending} new users`} sub="Users · Approval · Waiting 1 day" chev={false}
            go="users.approve" right={<Btn sm kind="primary" go="users.approve">Open</Btn>} />
        </Rows>
        <Label>Today</Label>
        <Rows plain>{F.today.map(t => <FocusRow key={t.title} t={t} />)}</Rows>
        <Label>This week</Label>
        <Rows plain><FocusRow t={F.week[0]} /></Rows>
        <Link go="tasks.my">{ALL_TASKS}</Link>
      </>
    );
  }
  const week = role === 'member' ? F.week : [F.week[0]];
  return (
    <>
      <Label>Overdue</Label>
      <Rows plain>{F.overdue.map(t => <FocusRow key={t.title} t={t} />)}</Rows>
      <Label>Today</Label>
      <Rows plain>{F.today.map(t => <FocusRow key={t.title} t={t} />)}</Rows>
      <Label>This week</Label>
      <Rows plain>
        {week.map(t => <FocusRow key={t.title} t={t} />)}
        {role === 'pm' && (
          <FocusRow t={F.review} go="tasks.detail-review" task={17}
            btn={<Btn sm kind="primary" go="tasks.detail-review" task={17}>Review</Btn>} />
        )}
      </Rows>
      <Link go="tasks.my">{role === 'pm' ? F.all : ALL_TASKS}</Link>
    </>
  );
}
