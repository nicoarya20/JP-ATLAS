// My calendar: date maths for the week view and the signed-in person's events placed on real dates and minutes.
import { D } from '../../data/sample';

/** The prototype's today (D.today: Wednesday, Oct 7, 2026) and the status bar clock (9:41) as minutes after midnight. */
export const TODAY = new Date(2026, 9, 7);
export const NOW_MIN = 9 * 60 + 41;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

const DAY_MS = 864e5;

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** Whole days from a to b, counted on calendar dates so a DST switch does not shift the result. */
const daysBetween = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS);

/** The seven days (Sunday first, as in iOS Calendar) of the week holding d. */
export const weekOf = d => Array.from({ length: 7 }, (_, i) => addDays(d, i - d.getDay()));

/** Day to select after moving n months from d: today when the target month holds it, else the 1st. */
export function shiftMonth(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return first.getFullYear() === TODAY.getFullYear() && first.getMonth() === TODAY.getMonth() ? TODAY : first;
}

/** "October 2026". */
export const monthLabel = d => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "Wednesday, Oct 7, 2026". */
export const dayLabel = d => `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
/** Hour row label: "12 AM", "9 AM", "12 PM", "3 PM". */
export const hourLabel = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
/** Clock text of a minute count: "9:41". */
export const clock = min => `${Math.floor(min / 60) % 12 || 12}:${String(min % 60).padStart(2, '0')}`;

/** "2:00" + "PM" -> 840. */
function toMin(hm, half) {
  const [h, m] = hm.split(':').map(Number);
  return ((h % 12) + (half === 'PM' ? 12 : 0)) * 60 + m;
}

/** Repeat interval in days from D's repeat text ("every 2 weeks"), or 0 for a one-off event. */
function repeatDays(text) {
  const m = text?.match(/every (\d+ )?weeks?/);
  return m ? Number(m[1] || 1) * 7 : 0;
}

/**
 * Events the person attends, as {e, date, start, end, every}: start/end in minutes after midnight, every = repeat
 * interval in days. Every sample event is in October 2026 and its range shares one AM/PM ("10:00–11:00 AM").
 */
export function eventsFor(name) {
  return D.events.filter(e => e.attendees.includes(name)).map(e => {
    const [from, to] = e.range.split('–');
    const half = e.range.slice(-2);
    const date = e.day === 'Today' ? TODAY : new Date(2026, 9, Number(e.day.split(' ')[1]));
    return { e, date, start: toMin(from, half), end: toMin(to.slice(0, -3), half), every: repeatDays(e.repeat) };
  });
}

/** True when the event (or one of its repeats) falls on day. */
export function occursOn(item, day) {
  const n = daysBetween(item.date, day);
  return n === 0 || (item.every > 0 && n > 0 && n % item.every === 0);
}

/** The items on day, earliest first. */
export const itemsOn = (items, day) => items.filter(it => occursOn(it, day)).sort((a, b) => a.start - b.start);
