/**
 * Profile ② My calendar (map `phase2-map-profile-archive.md` §3): one week of `GET /api/app/events?from=<Sunday>&to=
 * <Saturday>` (the Events tab's window cache, every page), placed on days and minutes in the team's zone. The server
 * has no "my events": it sends every event the caller may see, so "mine" is the ones they take part in
 * (`participants.isParticipant`, GAP C-1). A canceled event stays, drawn as canceled; one spanning midnight is cut
 * at each day's edge.
 */
import { today } from './clock';
import { eventsWindowResource } from './events.api';
import type { EventHref } from './events.shared';
import { timeRange } from './events.time';
import { eventDays, whereOf } from './events.view';
import type { EventKindWire, EventListItemWire, EventsPageWire } from './events.wire';
import { instantParts } from './instant';
import {
  dayLabel,
  initialScroll,
  MIN_PER_DAY,
  monthLabel,
  WEEKDAYS,
  weekday,
  weekOf,
} from './profile.calendar.dates';
import type { Resource } from './resource';

/** Event colour on the day grid, per kind. */
export type CalendarTone = 'blue' | 'purple' | 'red' | 'green' | 'gray';

const TONE: Record<EventKindWire, CalendarTone> = {
  meeting: 'blue',
  review: 'purple',
  important: 'red',
  team: 'green',
  other: 'gray',
};

export type CalendarDay = {
  iso: string;
  num: number;
  /** First letter of the weekday ("W"). */
  letter: string;
  /** "Wednesday, Oct 7, 2026, today". */
  label: string;
  picked: boolean;
  today: boolean;
  weekend: boolean;
  /** Has at least one of my events. */
  marked: boolean;
};

export type CalendarBlock = {
  id: string;
  title: string;
  /** "2:00–3:00 PM · In person · Meeting Room 2", "Canceled · …" for a canceled one. */
  meta: string;
  start: number;
  end: number;
  tone: CalendarTone;
  canceled: boolean;
  href: EventHref;
};

export type MyCalendarData = {
  month: string;
  week: CalendarDay[];
  /** "Wednesday, Oct 7, 2026". */
  dayLabel: string;
  /** "2 events", "1 event" or "No events". */
  count: string;
  blocks: CalendarBlock[];
  /** Where the hour grid opens. */
  scrollY: number;
};

export const CANCELED = 'Canceled';

/** The week holding `day`: one request for all seven days, every page of it. */
export function myWeekResource(day: string): Resource<EventsPageWire> {
  const week = weekOf(day);
  return eventsWindowResource(week[0], week[6], '');
}

const minuteOf = (at: string) => {
  const p = instantParts(at);
  return p.hour * 60 + p.minute;
};

/** My events touching `day`, cut to it, earliest first. */
export function blocksOn(items: readonly EventListItemWire[], day: string): CalendarBlock[] {
  return items
    .filter((e) => e.participants.isParticipant)
    .filter((e) => {
      const d = eventDays(e);
      return d.start <= day && day <= d.end;
    })
    .map((e) => {
      const d = eventDays(e);
      const when = `${timeRange(e.startsAt, e.endsAt)} · ${whereOf(e)}`;
      return {
        id: e.id,
        title: e.title,
        meta: e.canceledAt ? `${CANCELED} · ${when}` : when,
        start: d.start === day ? minuteOf(e.startsAt) : 0,
        end: d.end === day ? minuteOf(e.endsAt) : MIN_PER_DAY,
        tone: TONE[e.kind] ?? 'gray',
        canceled: e.canceledAt !== null,
        href: `/events/${e.id}` as EventHref,
      };
    })
    .sort((a, b) => a.start - b.start);
}

/** Week strip holding `day`, Sunday first; a day is marked when one of my events touches it. */
export const weekDays = (items: readonly EventListItemWire[], day: string): CalendarDay[] =>
  weekOf(day).map((iso) => ({
    iso,
    num: Number(iso.slice(8)),
    letter: WEEKDAYS[weekday(iso)].charAt(0),
    label: `${dayLabel(iso)}${iso === today() ? ', today' : ''}`,
    picked: iso === day,
    today: iso === today(),
    weekend: weekday(iso) % 6 === 0,
    marked: blocksOn(items, iso).length > 0,
  }));

/** Profile ② My calendar on `day`, from that week's events. */
export function getMyCalendar(day: string, items: readonly EventListItemWire[]): MyCalendarData {
  const blocks = blocksOn(items, day);
  const n = blocks.length;
  return {
    month: monthLabel(day),
    week: weekDays(items, day),
    dayLabel: dayLabel(day),
    count: n ? `${n} event${n > 1 ? 's' : ''}` : 'No events',
    blocks,
    scrollY: initialScroll(blocks[0]?.start),
  };
}
