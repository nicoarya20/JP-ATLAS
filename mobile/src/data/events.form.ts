// New event / Edit form options and checks, ported from the prototype's events.new.jsx (and the due picks of
// events.outcomes.jsx): dates from today to the end of its month, times 7:00 AM–9:00 PM every 15 minutes.
import { today } from './clock';
import { monthDay } from './dates';
import { clockMinutes, dateLabel, monthOf } from './events.dates';
import type { EventFields } from './events.store';

const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const STEP_MIN = 15;

/** Location modes of the form's switch. */
export const MODES = ['In person', 'Online'] as const;

/** "9:00 AM" of minutes since midnight. */
const clock = (n: number) =>
  `${((Math.floor(n / 60) + 11) % 12) + 1}:${String(n % 60).padStart(2, '0')} ${n < 720 ? 'AM' : 'PM'}`;

/** Start / End options: 7:00 AM to 9:00 PM every 15 minutes (57 times). */
export const TIMES: readonly string[] = Array.from(
  { length: ((LAST_HOUR - FIRST_HOUR) * 60) / STEP_MIN + 1 },
  (_, i) => clock(FIRST_HOUR * 60 + i * STEP_MIN),
);

/**
 * Dates from today to the end of today's month (every sample event is in today's month). Functions, not constants:
 * the server's clock is not in yet when this module is imported, and `today()` throws until it is.
 */
const ahead = () => {
  const from = today();
  return monthOf(from).filter((d) => d >= from);
};

/** Date options of the form: ISO value, "Thu, Oct 8" label. */
export const dates = () => ahead().map((value) => ({ value, label: dateLabel(value) }));

/** Due date picks of a Step 3 draft: ISO value, "Oct 9" label (a task's due label). */
export const dueDates = () => ahead().map((value) => ({ value, label: monthDay(value) }));

export type EventCheck = {
  /** Save is allowed: a title and an end after the start. */
  ok: boolean;
  /** False shows "The end time must be after the start time." */
  timeOk: boolean;
};

/** Checks of the form: the title is required and the end time must be after the start time. */
export function validateEvent(f: Pick<EventFields, 'title' | 'start' | 'end'>): EventCheck {
  const timeOk = clockMinutes(f.end) > clockMinutes(f.start);
  return { ok: !!f.title.trim() && timeOk, timeOk };
}

/** Agenda items from the form's text, one per line; a leading "1. " numbering and blank lines are dropped. */
export const agendaLines = (text: string) =>
  text
    .split('\n')
    .map((a) => a.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

/** Fields as Save stores them: the title and place trimmed, an online event's place "Online". */
export const savedFields = (f: EventFields): EventFields => ({
  ...f,
  title: f.title.trim(),
  place: f.mode === 'Online' ? 'Online' : f.place.trim(),
});
