/**
 * Events ① list from `GET /api/app/events` (map §1): the page the filters and the search ask for, grouped by schedule
 * or type on the phone, with "Load more" while the server has more.
 */
import { useEffect } from 'react';

import type { ApiError } from '@/api/errors';

import { today } from './clock';
import { daysBetween } from './dates';
import { eventsListResource } from './events.api';
import { dayLabel, groupLabel } from './events.dates';
import { type EventsQuery, eventsParams, GROUP_TYPE, isFiltered } from './events.query';
import { TYPES } from './events.shared';
import { type EventRow, rowOf } from './events.view';
import type { EventListItemWire } from './events.wire';
import type { ResourcePhase } from './resource';

/** A card of the list: its row, and the time tile. */
export type EventCard = EventRow & {
  /** The start time in the Today / Tomorrow groups, else the day ("Thu 8"). */
  when: string;
};

export type EventsListView = {
  /** The query string this list is, for "Load more". */
  params: string;
  phase: ResourcePhase;
  error: ApiError | null;
  /** Nothing to show yet: loading, or failed before any page came. */
  blank: boolean;
  groups: { title: string; data: EventCard[] }[];
  /** The server has more after these. */
  more: boolean;
  /** Why the list is empty: the filters or search left nothing, or there is nothing at all. */
  empty: 'noMatch' | 'none' | null;
  /** The filter icon's dot. */
  filtered: boolean;
};

/** Days ahead whose group shows the start time instead of the day: Today and Tomorrow. */
const TIMED_GROUPS = [0, 1];

function cardOf(e: EventListItemWire): EventCard {
  const row = rowOf(e);
  const near = TIMED_GROUPS.includes(daysBetween(today(), row.date));
  return { ...row, when: near ? row.start : dayLabel(row.date) };
}

/** Sections: by schedule (each date's group, in the server's order) or by type (form order); none empty. */
export function groupCards(cards: readonly EventCard[], group: number) {
  const byType = group === GROUP_TYPE;
  const of = (c: EventCard): string => (byType ? c.type : groupLabel(c.date));
  const keys = byType
    ? TYPES.filter((t) => cards.some((c) => c.type === t))
    : [...new Set(cards.map(of))];
  return keys.map((title) => ({ title, data: cards.filter((c) => of(c) === title) }));
}

/** The list for `query` and `search`, kept up to date: fetches what is missing. */
export function useEventsList(query: EventsQuery, search: string): EventsListView {
  const params = eventsParams(query, search);
  const res = eventsListResource(params);
  const state = res.use();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  const items = state.data?.items ?? [];
  const blank = state.data === null;
  const ready = state.phase === 'ready' || (state.phase === 'loading' && !blank);
  const narrowed = isFiltered(query) || !!search.trim();
  return {
    params,
    phase: state.phase,
    error: state.error,
    blank,
    groups: groupCards(items.map(cardOf), query.group),
    more: !!state.data?.nextCursor,
    empty: ready && !items.length ? (narrowed ? 'noMatch' : 'none') : null,
    filtered: isFiltered(query),
  };
}
