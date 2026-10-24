// Calendar maths and labels on ISO dates ("2026-10-07"), computed in UTC so the phone's time zone never shifts a day.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 864e5;

/** Midnight UTC of an ISO date; throws on anything but YYYY-MM-DD. */
export function toUtc(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Not an ISO date (YYYY-MM-DD): ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) =>
  Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);

/** True when both dates fall in the same calendar month. */
export const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

/** Days back from `iso` to that week's Monday (weeks run Monday to Sunday). */
export const daysSinceMonday = (iso: string) => (toUtc(iso).getUTCDay() + 6) % 7;

/** Days from `iso` to that week's Sunday. */
export const daysToSunday = (iso: string) => 6 - daysSinceMonday(iso);

/** "Oct 7". */
export function monthDay(iso: string): string {
  const d = toUtc(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Wed, Oct 7". */
export const weekdayMonthDay = (iso: string) =>
  `${WEEKDAYS[toUtc(iso).getUTCDay()]}, ${monthDay(iso)}`;
