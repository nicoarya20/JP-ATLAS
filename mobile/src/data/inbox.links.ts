// Where an inbox item leads and who is behind it (prototype inbox.shared.js), read from the live task and event lists.
import { eventHref } from './events.shared';
import { eventsStore } from './events.store';
import { person } from './people';
import { getTask } from './tasks.state';

/**
 * Where an inbox item leads: a task, an event, a project, or Users. A plain path, since some of these route files land
 * in other modules later; screens pass it through routeHref() when they navigate.
 */
export type InboxHref = string;

const ATLAS = 'Atlas Project';

/** Person behind an item: the first word of the title, else "by <name>" in the meta. */
export function actor(title: string, meta = ''): string {
  const name = title.split(' ')[0] ?? '';
  return person(name) ? name : (/by (\w+)/.exec(meta)?.[1] ?? '');
}

/** What an item opens: a task by its #number, an event by its title, Atlas by its name, else Projects. */
export function link(text: string): InboxHref {
  const no = /#(\d+)/.exec(text)?.[1];
  if (no) return getTask(Number(no)) ? `/tasks/${Number(no)}` : '/tasks?scope=all';
  const ev = eventsStore.get().list.find((e) => text.includes(e.title));
  if (ev) return eventHref(ev);
  return text.includes(ATLAS) ? '/projects/atlas' : '/projects';
}
