// Inbox helpers: whose inbox is shown, who an item is about, and which screen an item opens.
import { D } from '../../data/sample';
import { taskScreen } from '../events/events.shared';

/** Signed-in person's inbox items; Admin reuses the PM items (slots: [task, outcomes or invite, mention]). */
export const items = is => (is('member') ? D.inbox.member : D.inbox);

/** Person behind an item: the first word of the title, else "by <name>" in the meta. */
export const actor = (title, meta = '') => {
  const name = title.split(' ')[0];
  return D.person(name) ? name : (meta.match(/by (\w+)/) || [])[1] || '';
};

/** Event screens reachable from the inbox, by event id. */
const EVENT_SCREEN = { review: 'events.detail-upcoming', sprint: 'events.detail-recurring', kickoff: 'events.detail-confirmed', daily: 'events.step3' };

/** Nav props for an item: a task by its #number, an event by its title, an Atlas item its overview, else the projects list. */
export const link = text => {
  const t = D.task(Number((text.match(/#(\d+)/) || [])[1]));
  if (t) return { go: taskScreen(t), task: t.no };
  if (/#\d+/.test(text)) return { go: 'tasks.all' };
  const ev = D.events.find(e => text.includes(e.title));
  if (ev) return { go: EVENT_SCREEN[ev.id] || 'events.list' };
  return { go: text.includes(D.project('atlas').name) ? 'projects.overview' : 'projects.list' };
};

/** Admin's own updates feed (D.inbox.updates is written for Nico). */
export const ADMIN_UPDATES = () => ({
  Today: [{ title: 'Rina replied to your comment', meta: 'Task #12 Fix SSO login · Atlas Project · 40 min ago' }, D.inbox.updates[2]],
  Yesterday: [{ title: 'You were made Viewer of project PT Sinar Client Portal', meta: 'by Rina · Yesterday 2:10 PM' }],
});
