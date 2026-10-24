// Where an inbox item leads and who is behind it (prototype inbox.shared.js), read from the live task and event lists.
import type { Href } from 'expo-router';

import { routeHref } from '@/navigation/route-href';

import { eventHref } from './events.shared';
import { eventsStore } from './events.store';
import { person } from './people';
import { getTask } from './tasks.state';

/** Where an inbox item leads: a task, an event, a project, or Users. */
export type InboxHref = Href;

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
  // The project route files arrive with the Projects module (W4); until then that one path is widened.
  return text.includes(ATLAS) ? routeHref('/projects/atlas') : '/projects';
}
