// Events ① list getter (prototype events.list.jsx): the role's events narrowed by the query and the search, grouped,
// each as a card with its status pill, time tile and results button. Re-exported by events.ts.
import { dayLabel } from './events.dates';
import {
  applyQuery,
  type EventGroup,
  type EventsQuery,
  eventsFor,
  groupEvents,
  isFiltered,
  searchEvents,
} from './events.query';
import {
  type EventHref,
  type EventItem,
  type EventStatusLabel,
  eventHref,
  eventStatus,
  isConfirmed,
} from './events.shared';
import { eventsStore } from './events.store';
import type { Role } from './sample';

/** A card of the list: where it opens, its status pill, the time tile and which results button it has. */
export type EventCard = {
  event: EventItem;
  href: EventHref;
  status: EventStatusLabel;
  /** Time tile: the start time in the Today / Tomorrow groups, else the day ("Thu 8"). */
  when: string;
  /** Done events: View results (confirmed, or a Member) or Check results (PM / Admin, not yet confirmed). */
  results: 'view' | 'check' | null;
};

export type EventsListData = {
  groups: { title: string; data: EventCard[] }[];
  /** The filter icon's dot. */
  filtered: boolean;
  /** Nothing to list before any filter: a Member who attends no event (events.empty). */
  empty: boolean;
};

function cardOf(role: Role, e: EventItem, group: string): EventCard {
  const results =
    e.status !== 'Done' ? null : isConfirmed(e) || role === 'member' ? 'view' : 'check';
  const when = /^(Today|Tomorrow)/.test(group) ? e.time : dayLabel(e.date);
  return { event: e, href: eventHref(e), status: eventStatus(e), when, results };
}

/** Events list of `role`: the store's events narrowed by the query and the search text, grouped. */
export function getEventsList(
  role: Role,
  { query, search = '' }: { query: EventsQuery; search?: string },
): EventsListData {
  const mine = eventsFor(role, eventsStore.get().list);
  const groups = groupEvents(searchEvents(applyQuery(mine, query), search), query);
  return {
    groups: groups.map((g: EventGroup) => ({
      title: g.title,
      data: g.data.map((e) => cardOf(role, e, g.title)),
    })),
    filtered: isFiltered(query),
    empty: mine.length === 0,
  };
}
