// Home per role (Penpot Home · Member / PM / Admin): stat chips, My Focus rows and list lengths change; layout stays.
import { CalendarDays, CircleCheck, Clock, FolderOpen, Hourglass, Inbox, TriangleAlert, UserCheck } from 'lucide-react';
import { D } from '../../data/sample';
import { Btn, Link, Row, Rows } from '../../kit';
import { inboxToRespond, myTaskStats, upcomingThisMonth } from './home.stats';

const ICON = 15;
const STAT_GO = { tasks: 'tasks.all', projects: 'projects.list', users: 'users.approve', calendar: 'events.calendar', inbox: 'inbox.respond' };
const STAT_ICON = {
  Assigned: <UserCheck size={ICON} />, 'In Progress': <Clock size={ICON} />, Completed: <CircleCheck size={ICON} />, Upcoming: <CalendarDays size={ICON} />,
  Inbox: <Inbox size={ICON} />,
  Active: <FolderOpen size={ICON} />, Overdue: <TriangleAlert size={ICON} />, Awaiting: <Hourglass size={ICON} />,
};

/** Stat chip: {label, count, go, sub, icon, alert}. count null hides the number; sub defaults to the unit ("projects"); alert shows sub in red. */
const stat = (label, count, unit, sub = unit, alert = false) => ({ label, count, sub, alert, go: STAT_GO[unit], icon: STAT_ICON[label] });

/** Last chips for every role: what is still ahead on the signed-in person's calendar this month, then their Inbox. */
const aheadStats = role => [stat('Upcoming', null, 'calendar', upcomingThisMonth().sub), stat('Inbox', null, 'inbox', inboxToRespond(role).sub)];

/** Member and Manager chips: the signed-in person's own tasks from D.tasks, then aheadStats. */
function taskStats(role) {
  const S = myTaskStats();
  return [['Assigned', S.assigned], ['In Progress', S.inProgress], ['Completed', S.completed]]
    .map(([label, x]) => stat(label, x.count, 'tasks', x.sub, x.alert))
    .concat(aheadStats(role));
}

/** Admin chips: workspace health (active projects, overdue tasks, users awaiting approval), then aheadStats. */
const adminStats = () => [
  stat('Active', D.projects.filter(p => p.status === 'Active').length, 'projects'), stat('Overdue', 3, 'tasks'), stat('Awaiting', D.users.counts.pending, 'users'),
  ...aheadStats('admin'),
];

/** Per role: stat chips, number of Ask Data questions, completed-this-week rows, activity rows. */
export function roleHome(role) {
  const R = {
    member: { stats: taskStats('member'), asks: 2, done: 2, activity: 1 },
    pm: { stats: taskStats('pm'), asks: 3, done: 4, activity: 3 },
    admin: { stats: adminStats(), asks: 3, done: 4, activity: 3 },
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
