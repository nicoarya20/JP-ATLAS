/**
 * What the Events screens show of an event from the server (`events.wire.ts`): its status, time, place and type in
 * the app's words. "Today" is the server's (K1) and every time is read in the team's zone (`instant.ts`).
 */
import { today } from './clock';
import { weekdayMonthDay } from './dates';
import { KIND_LABEL } from './events.query';
import type { EventHref, EventStatusLabel } from './events.shared';
import { dayAndClock, timeRange } from './events.time';
import type { EventListItemWire, LocationTypeWire, NoteStatusWire } from './events.wire';
import { instantDate } from './instant';

type Timed = Pick<EventListItemWire, 'startsAt' | 'endsAt' | 'canceledAt'>;

/** The first and last day an event touches, in the team's zone. */
export const eventDays = (e: Pick<EventListItemWire, 'startsAt' | 'endsAt'>) => ({
  start: instantDate(e.startsAt),
  end: instantDate(e.endsAt),
});

/**
 * Status pill: Canceled; Done once its last day is behind today; Today while it touches today; else Upcoming. The
 * server sends no "now" instant, so an event earlier today stays Today until the day is over.
 */
export function eventStatusOf(e: Timed, on: string = today()): EventStatusLabel {
  if (e.canceledAt) return 'Canceled';
  const { start, end } = eventDays(e);
  if (end < on) return 'Done';
  return start <= on ? 'Today' : 'Upcoming';
}

/** True when the event touches `date`. */
export const touches = (e: Pick<EventListItemWire, 'startsAt' | 'endsAt'>, date: string) => {
  const { start, end } = eventDays(e);
  return start <= date && date <= end;
};

export const MODE_LABEL: Record<LocationTypeWire, 'In person' | 'Online'> = {
  offline: 'In person',
  online: 'Online',
};

export const NO_LOCATION = 'No location';

/** "Online", "In person · Room 2", "In person", or the place alone when no mode was picked. */
export function whereOf(e: Pick<EventListItemWire, 'locationType' | 'locationText'>): string {
  const place = e.locationText?.trim() || '';
  if (e.locationType === 'online') return MODE_LABEL.online;
  if (e.locationType === 'offline')
    return place ? `${MODE_LABEL.offline} · ${place}` : MODE_LABEL.offline;
  return place || NO_LOCATION;
}

/** The minutes' state in words, or null when there are none yet. */
export const NOTE_LABEL: Record<NoteStatusWire, string> = {
  draft: 'Minutes draft',
  confirmed: 'Minutes confirmed',
};

/** One event as a list card or an agenda row shows it. */
export type EventRow = {
  id: string;
  href: EventHref;
  title: string;
  /** First day, in the team's zone. */
  date: string;
  /** "Wed, Oct 7". */
  day: string;
  /** "2:00 PM", the time tile. */
  start: string;
  /** "2:00–3:00 PM". */
  range: string;
  where: string;
  type: string;
  status: EventStatusLabel;
  note: string | null;
};

/** The row of event e. */
export function rowOf(e: EventListItemWire): EventRow {
  const { start } = eventDays(e);
  return {
    id: e.id,
    href: `/events/${e.id}`,
    title: e.title,
    date: start,
    day: weekdayMonthDay(start),
    start: dayAndClock(e.startsAt).clock,
    range: timeRange(e.startsAt, e.endsAt),
    where: whereOf(e),
    type: KIND_LABEL[e.kind],
    status: eventStatusOf(e),
    note: e.noteStatus ? NOTE_LABEL[e.noteStatus] : null,
  };
}
