// Home stat chips for Member and Manager, counted from D.tasks, D.events and D.inbox for the signed-in person against the sample "today".
import { D } from '../../data/sample';
import { EV } from '../events/events.shared';
import { items } from '../inbox/inbox.shared';
import { TODAY, assigned, days } from '../tasks/tasks.shared';

/** Days back to this week's Monday (the sample week runs Monday to Sunday). */
const SINCE_MONDAY = (TODAY.getDay() + 6) % 7;
/** Completion date label of a Done task: "Done Sep 20" → "Sep 20". */
const doneOn = t => t.when.replace(/^Done /, '');
const late = t => days(t.due) < 0;
/** Short "Oct 7" label of today, and its month. */
const TODAY_LABEL = D.today.short.slice(5), MONTH = TODAY_LABEL.split(' ')[0];
/** True for a short "Oct 9" label from today to the end of this month. */
const leftThisMonth = s => s.split(' ')[0] === MONTH && days(s) >= 0;

/** Line under In Progress: what is most urgent among the tasks being worked on. */
function activeSub(active) {
  const overdue = active.filter(late).length, today = active.filter(t => days(t.due) === 0).length;
  if (overdue) return `${overdue} overdue`;
  if (today) return `${today} due today`;
  if (!active.length) return 'none started';
  return `next due ${[...active].sort((a, b) => days(a.due) - days(b.due))[0].due}`;
}

/** My open tasks (with overdue count), tasks in progress (with the most urgent due) and tasks done this week. */
export function myTaskStats() {
  const mine = D.tasks.filter(t => assigned(t, D.me().name));
  const open = mine.filter(t => t.status !== 'Done'), overdue = open.filter(late).length;
  const active = mine.filter(t => t.status === 'In progress');
  const done = mine.filter(t => t.status === 'Done' && days(doneOn(t)) >= -SINCE_MONDAY);
  return {
    assigned: { count: open.length, sub: overdue ? `${overdue} overdue` : 'on track', alert: overdue > 0 },
    inProgress: { count: active.length, sub: activeSub(active), alert: active.some(late) },
    completed: { count: done.length, sub: 'this week', alert: false },
  };
}

/** Calendar items still ahead this month: my open tasks due from today on, plus events I attend that haven't happened yet. */
export function upcomingThisMonth() {
  const me = D.me().name;
  const tasks = D.tasks.filter(t => assigned(t, me) && t.status !== 'Done' && leftThisMonth(t.due));
  const events = D.events.filter(e => e.attendees.includes(me) && e.status !== 'Done' && leftThisMonth(EV.date(e).slice(5)));
  const n = tasks.length + events.length;
  return { count: n, sub: `${n} ${n === 1 ? 'item' : 'items'}` };
}

/** Inbox chip line: how many "Needs your response" cards the role's Inbox shows, or all caught up. */
export function inboxToRespond(role) {
  const n = items(r => r === role).respond.length;
  return { count: n, sub: n ? `${n} to respond` : 'all caught up' };
}
