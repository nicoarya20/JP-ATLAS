/**
 * The events My calendar draws: `GET /api/app/events?from&to`, the date-range read the Events
 * module's calendar also uses (GAP-A9, built for Phase 2).
 *
 * **Why a resource of its own rather than `eventsWindowResource`.** That one holds the window the
 * *Events* calendar is pointed at, in module state, and nothing unmounts when you navigate away
 * (`phase2-pola-data.md` rule 2) — so two screens sharing it would keep pointing it at different
 * weeks and refetching each other's. One resource per range, held by range, costs one request and
 * cannot do that.
 *
 * **"Mine" is the server's answer, not a guess here**: a row carries
 * `participants.isParticipant`, so My calendar is that flag and no person matching of its own.
 *
 * The range read is keyset-paged like every event list, so the pages are read to the end (up to a
 * cap). Past the cap the week would silently miss events, so `truncated` says so instead.
 */
import { apiGet } from '@/api';

import type { EventListItemWire, EventsPageWire } from './events.wire';
import { type Resource, resource } from './resource';

/** Rows per request; the server's own maximum for an event page. */
const LIMIT = 100;
/** A week of mine holding more than this many events is not what this screen is for. */
const MAX_PAGES = 5;

/** The events of one date range that the caller is a participant of. */
export type MyWeek = {
  items: EventListItemWire[];
  /** The range held more rows than were read, so a day may be missing some. */
  truncated: boolean;
};

const EMPTY_WEEK: MyWeek = { items: [], truncated: false };

const rangeUrl = (from: string, to: string, cursor?: string): string => {
  const params = new URLSearchParams({ from, to, limit: String(LIMIT) });
  if (cursor) params.set('cursor', cursor);
  return `/api/app/events?${params.toString()}`;
};

async function loadRange(from: string, to: string): Promise<MyWeek> {
  const items: EventListItemWire[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const answer = await apiGet<EventsPageWire>(rangeUrl(from, to, cursor));
    // Only the events I am on: My calendar is mine, and whether a row is mine is the server's
    // answer on the row itself.
    items.push(...answer.items.filter((item) => item.participants.isParticipant));
    if (!answer.nextCursor) return { items, truncated: false };
    cursor = answer.nextCursor;
  }
  return { items, truncated: true };
}

const ranges = new Map<string, Resource<MyWeek>>();

/** My events between `from` and `to` (ISO dates, both ends included). */
export function myEventsRange(from: string, to: string): Resource<MyWeek> {
  const key = `${from}..${to}`;
  const held = ranges.get(key);
  if (held) return held;
  const made = resource<MyWeek>(`profile.calendar:${key}`, () => loadRange(from, to));
  ranges.set(key, made);
  return made;
}

/** What is on hand for a range, or an empty week while the first read is out. */
export const peekEventsRange = (from: string, to: string): MyWeek =>
  myEventsRange(from, to).current() ?? EMPTY_WEEK;

/** Drop the held ranges. test-only */
export const resetCalendarApi = (): void => ranges.clear();
