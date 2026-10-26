// Where an inbox card leads. The server sends `href` as a **web** path (`/app/tasks/14`,
// `/dashboard/users`), which this app's router does not have, so it is mapped from the card's `ref`
// instead of used as it came. The old heuristic that guessed the person from the card's wording is
// gone: `actor` is explicit on the wire now.
import type { Href } from 'expo-router';

import type { InboxRefWire } from './inbox.api';

/** Where an inbox card leads: a task, a project, an event, Users, Settings, or the Inbox itself. */
export type InboxHref = Href;

/** Fallback for a card whose ref has no screen of its own, as the server's own fallback does. */
const INBOX: InboxHref = '/more/inbox';

/**
 * The route for a card's ref. A task is opened by its **number** (that is what `/tasks/[id]` takes);
 * a task card with no number falls back to the task list, exactly as the server's `hrefOf` does.
 */
export function refHref(ref: InboxRefWire): InboxHref {
  switch (ref.type) {
    case 'task':
    case 'comment':
      return ref.number === null ? '/tasks?scope=all' : `/tasks/${ref.number}`;
    case 'project':
      return `/projects/${ref.id}`;
    case 'event':
      return `/events/${ref.id}`;
    case 'user':
      return '/more/users';
    // A leave card has no page of its own; the person's own state lives in Settings.
    case 'leave':
      return '/more/settings';
    default:
      return INBOX;
  }
}
