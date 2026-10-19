/**
 * Pure helpers for how an event reads in the list: times, day headings and status. Every function
 * takes the clock (`now`, `today`, team zone) from the SSR loader, so server and browser print the
 * same text and no day boundary comes from the browser's own clock or zone (R03 D9).
 */
import { diffDays, type IsoDate, isoDateIn } from '@server/metrics/dates';
import type { EventKind } from '@server/pm/enums';
import type { EventListItem } from './events-api';

/** "Now" as the loader saw it, and the team zone (`APP_TIME_ZONE`) every event time is shown in. */
export type EventsClock = { now: number; today: IsoDate; timeZone: string };

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  meeting: 'Rapat',
  review: 'Tinjauan',
  important: 'Penting',
  team: 'Acara tim',
  other: 'Lainnya',
};

/** What the badge says about an event right now, worked out from its own times and `canceledAt`. */
export type EventStatus = 'canceled' | 'ongoing' | 'ended' | 'scheduled';

export const EVENT_STATUS_LABELS: Record<Exclude<EventStatus, 'scheduled'>, string> = {
  canceled: 'Dibatalkan',
  ongoing: 'Berlangsung',
  ended: 'Selesai',
};

export function eventStatus(
  e: Pick<EventListItem, 'startsAt' | 'endsAt' | 'canceledAt'>,
  now: number,
): EventStatus {
  if (e.canceledAt) return 'canceled';
  if (Date.parse(e.endsAt) <= now) return 'ended';
  return Date.parse(e.startsAt) <= now ? 'ongoing' : 'scheduled';
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(key: string, zone: string, options: Intl.DateTimeFormatOptions) {
  const id = `${key}|${zone}`;
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat('id-ID', { ...options, timeZone: zone });
    formatters.set(id, f);
  }
  return f;
}

/** Calendar day (`YYYY-MM-DD`) of an instant in the team zone; midnight belongs to the new day. */
export const dayKeyOf = (iso: string, timeZone: string): IsoDate =>
  isoDateIn(new Date(iso), timeZone);

/** `09.00` in the team zone. */
export const formatEventTime = (iso: string, timeZone: string): string =>
  formatter('time', timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );

/** `09.00–10.00`; an event that ends on another day names that day: `23.00–21 Okt 01.00`. */
export function formatTimeRange(
  e: Pick<EventListItem, 'startsAt' | 'endsAt'>,
  timeZone: string,
): string {
  const start = formatEventTime(e.startsAt, timeZone);
  const end = formatEventTime(e.endsAt, timeZone);
  if (dayKeyOf(e.startsAt, timeZone) === dayKeyOf(e.endsAt, timeZone)) return `${start}–${end}`;
  const day = formatter('short-day', 'UTC', { day: 'numeric', month: 'short' }).format(
    new Date(`${dayKeyOf(e.endsAt, timeZone)}T00:00:00Z`),
  );
  return `${start}–${day} ${end}`;
}

/** Where it happens: the written place, else "Online" for a meeting link; null when neither is known. */
export function locationLabel(
  e: Pick<EventListItem, 'locationType' | 'locationText'>,
): string | null {
  const text = e.locationText?.trim();
  if (text) return text;
  return e.locationType === 'online' ? 'Online' : null;
}

const RELATIVE_DAYS: Record<number, string> = { [-1]: 'Kemarin', 0: 'Hari ini', 1: 'Besok' };

/** `Hari ini · Selasa, 20 Oktober`, `Besok · …`, `Kemarin · …`; any other day is just `Rabu, 21 Oktober`. */
export function dayHeading(dayKey: IsoDate, today: IsoDate): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  const sameYear = dayKey.slice(0, 4) === today.slice(0, 4);
  const full = formatter(sameYear ? 'heading' : 'heading-year', 'UTC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
  const relative = RELATIVE_DAYS[diffDays(today, dayKey)];
  return relative ? `${relative} · ${full}` : full;
}

export type EventDayGroup = { key: IsoDate; heading: string; items: EventListItem[] };

/**
 * Events under one heading per team-zone day, in the order given (the server already sorts by time
 * in the tab's own direction, so neighbours share a day and the group order is the list order).
 */
export function groupByDay(items: readonly EventListItem[], clock: EventsClock): EventDayGroup[] {
  const groups: EventDayGroup[] = [];
  for (const item of items) {
    const key = dayKeyOf(item.startsAt, clock.timeZone);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, heading: dayHeading(key, clock.today), items: [item] });
  }
  return groups;
}
