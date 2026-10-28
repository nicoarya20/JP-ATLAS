// Date labels of the Projects screens on ISO dates, in UTC like src/data/dates.ts: "Oct 31, 2026", "Sep 25–Oct 20".
import { daysBetween, monthDay, toUtc } from './dates';

const DAY_MS = 864e5;

/** "Oct 31, 2026". */
export const longDate = (iso: string) => `${monthDay(iso)}, ${iso.slice(0, 4)}`;

/** The ISO date `n` days after `iso`. */
export const addDays = (iso: string, n: number) =>
  new Date(toUtc(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);

/** "Sep 1–24" within a month, "Sep 25–Oct 20" across two. */
export function rangeLabel(start: string, end: string): string {
  const [month] = monthDay(start).split(' ');
  const to =
    start.slice(0, 7) === end.slice(0, 7) ? String(toUtc(end).getUTCDate()) : monthDay(end);
  return `${month} ${toUtc(start).getUTCDate()}–${to}`;
}

/** "24 days left", "Due today" or "7 days overdue", counted from `today`. */
export function daysLeftLabel(today: string, due: string): string {
  const d = daysBetween(today, due);
  if (d === 0) return 'Due today';
  return d > 0 ? `${d} day${d === 1 ? '' : 's'} left` : `${-d} day${d === -1 ? '' : 's'} overdue`;
}

/** The ISO date `n` calendar months after `iso` (Oct 7 → Nov 7), clamped to the month's last day. */
export function addMonths(iso: string, n: number): string {
  const d = toUtc(iso);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d.getUTCDate(), last));
  return first.toISOString().slice(0, 10);
}

/** End dates of the form's quick picks: 1 wk, 2 wk, 1 mo, 3 mo after `start`. */
export const QUICK_ENDS: readonly ((start: string) => string)[] = [
  (s) => addDays(s, 7),
  (s) => addDays(s, 14),
  (s) => addMonths(s, 1),
  (s) => addMonths(s, 3),
];
