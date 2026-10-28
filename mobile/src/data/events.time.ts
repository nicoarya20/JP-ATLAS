/**
 * Event times between the server's instants and the form's day + clock time, always in the team's zone (K1/K2): an
 * event shown at 10:00 AM is 10:00 in the team's zone wherever the phone is, and the form sends that same moment
 * back. The reading side goes through `instant.ts`; the writing side is here, as nothing else turns a local time
 * into an instant.
 */
import { monthDay } from './dates';
import { clockMinutes } from './events.dates';
import { type Instant, instantParts } from './instant';

const MIN_PER_HOUR = 60;
const MIN_PER_DAY = 1440;
const NOON = 720;
const MS_PER_MIN = 60_000;

/** "9:05 AM" of minutes since midnight. */
export const clockOf = (n: number) =>
  `${((Math.floor(n / MIN_PER_HOUR) + 11) % 12) + 1}:${String(n % MIN_PER_HOUR).padStart(2, '0')} ${n < NOON ? 'AM' : 'PM'}`;

/** The day and the clock time ("2:00 PM") an instant reads as in the team's zone. */
export function dayAndClock(at: Instant, timeZone?: string) {
  const p = instantParts(at, timeZone);
  return { date: p.date, clock: clockOf(p.hour * MIN_PER_HOUR + p.minute) };
}

/**
 * "2:00–3:00 PM", "11:00 AM–12:00 PM" across noon, or "10:00 PM – Oct 9, 1:00 AM" when it ends on a later day.
 */
export function timeRange(startsAt: Instant, endsAt: Instant, timeZone?: string): string {
  const from = dayAndClock(startsAt, timeZone);
  const to = dayAndClock(endsAt, timeZone);
  if (from.date !== to.date) return `${from.clock} – ${monthDay(to.date)}, ${to.clock}`;
  return from.clock.slice(-2) === to.clock.slice(-2)
    ? `${from.clock.slice(0, -3)}–${to.clock}`
    : `${from.clock}–${to.clock}`;
}

/** Minutes the zone is ahead of UTC at `ms` (Jakarta: 420). */
function offsetAt(ms: number, timeZone: string): number {
  const p = instantParts(new Date(ms).toISOString(), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(ms / MS_PER_MIN) * MS_PER_MIN) / MS_PER_MIN);
}

/**
 * The instant of `date` at `clock` ("2:00 PM") in the team's zone, as the ISO string the server takes. The offset is
 * read twice, so a clock time next to a daylight-saving change still lands on the right side of it.
 */
export function zonedInstant(date: string, clock: string, timeZone: string): Instant {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Not an ISO date: ${date}`);
  const local = Date.UTC(y, m - 1, d, 0, clockMinutes(clock));
  const first = local - offsetAt(local, timeZone) * MS_PER_MIN;
  return new Date(local - offsetAt(first, timeZone) * MS_PER_MIN).toISOString();
}

/** One reminder offset in words: "1 day", "2 hours", "30 min"; 0 is the start itself. */
function reminderPart(n: number): string {
  if (n % MIN_PER_DAY === 0) return `${n / MIN_PER_DAY} day${n === MIN_PER_DAY ? '' : 's'}`;
  if (n % MIN_PER_HOUR === 0) return `${n / MIN_PER_HOUR} hour${n === MIN_PER_HOUR ? '' : 's'}`;
  return `${n} min`;
}

/** "1 day & 30 min before", "At the start", or "No reminder". */
export function reminderLabel(minutes: readonly number[]): string {
  if (!minutes.length) return 'No reminder';
  const before = [...minutes].sort((a, b) => b - a).filter((n) => n > 0);
  const parts = before.map(reminderPart);
  const words =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}` : parts[0];
  const atStart = minutes.includes(0);
  if (!words) return 'At the start';
  return atStart ? `${words} before, and at the start` : `${words} before`;
}
