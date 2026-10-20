// Home per role (Penpot Home · Member / PM / Admin): stat chips and list lengths change; layout stays.
import { CalendarDays, CircleCheck, Clock, FolderOpen, Hourglass, Inbox, TriangleAlert, UserCheck } from 'lucide-react';
import { D } from '../../data/sample';
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
