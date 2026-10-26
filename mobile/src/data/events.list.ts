// Events ① list getter (prototype events.list.jsx): one consistent read of `GET /api/app/events`,
// grouped into the sections the screen draws, each row a card with its status pill and time tile.
// Re-exported by events.ts.
//
// Synchronous, as every `get<Module>()` is: it reads what `eventsListResource` holds and never
// awaits. The screen asks for the data with `syncEventsList()` and watches the resource's phase.
import { eventsListResource } from './events.api';
import { dayLabel } from './events.dates';
import { type ServerEvent, toServerEvent } from './events.map';
import { type EventsQuery, groupEvents } from './events.query';
import { type EventHref, type EventStatusLabel, eventStatus } from './events.shared';
import type { Role } from './sample';

/** A card of the list: where it opens, its status pill and the time tile. */
export type EventCard = {
  event: ServerEvent;
  href: EventHref;
  status: EventStatusLabel;
  /** Time tile: the start time in the Today / Tomorrow groups, else the day ("Thu 8"). */
  when: string;
};

export type EventsListData = {
  groups: { title: string; data: EventCard[] }[];
  /**
   * Nothing to list at all. Only ever true for an unfiltered, unsearched first page: with paging,
   * an empty filtered page means "no match", which is a different screen.
   */
  empty: boolean;
  /** The server has a further page; the screen offers "Load more". */
  more: boolean;
  /** `caps.createEvent` of this page: may the viewer create an event at all (B1). */
  createEvent: boolean;
};

const EMPTY: EventsListData = { groups: [], empty: false, more: false, createEvent: false };

/** Always the detail: the Results and Outcomes screens have no server data (GAP-A8). */
const hrefOf = (e: ServerEvent): EventHref => `/events/${e.id}`;

const cardOf = (e: ServerEvent, group: string): EventCard => ({
  event: e,
  href: hrefOf(e),
  status: eventStatus(e),
  when: /^(Today|Tomorrow)/.test(group) ? e.time : dayLabel(e.date),
});

/**
 * Events list for the query and the search text on screen. `role` is still taken (and ignored) so
 * no screen signature changes while `AppCaps` is missing — `phase2-gap-disembunyikan.md` §4.1.
 */
export function getEventsList(_role: Role, { query }: { query: EventsQuery }): EventsListData {
  const page = eventsListResource.current();
  if (!page) return EMPTY;
  // The tab comes from the answer, not from the query on screen: a query just changed is a frame
  // ahead of the data, and labelling an upcoming event "Done" for that frame is exactly the kind of
  // quiet wrongness the server's own cut avoids.
  const events = page.items.map((item) => toServerEvent(item, { past: page.tab === 'past' }));
  return {
    groups: groupEvents(events, query).map((g) => ({
      title: g.title,
      data: g.data.map((e) => cardOf(e, g.title)),
    })),
    empty: page.unfiltered && page.items.length === 0,
    more: page.more,
    createEvent: page.createEvent,
  };
}
