// Events helpers shared by the events screens, Home and Inbox: the wide event type, its status, times and place, and
// which route an event opens. Ported from the prototype's events.shared.js.
import { weekdayMonthDay } from './dates';
import { PROJECTS, type SampleEvent, TODAY } from './sample';
import { EVENT_RESULTS, type EventExtra, type Repeat } from './sample/events.extra';

/** Event types offered by the new-event form, in form order. */
export const TYPES = ['Meeting', 'Review', 'Important', 'Team event', 'Other'] as const;
export type EventType = (typeof TYPES)[number];

/** Repeat options of the form as [label, repeat value]; index 0 = does not repeat. */
export const REPEATS: readonly (readonly [string, Repeat | ''])[] = [
  ['No', ''],
  ['Daily', 'daily'],
  ['Every week', 'every week'],
  ['Every 2 weeks', 'every 2 weeks'],
];

/** How many days apart a recurring event's next dates are, per repeat option. */
export const REPEAT_DAYS: Record<Repeat, number> = {
  daily: 1,
  'every week': 7,
  'every 2 weeks': 14,
};

/** Project of every sample event: the sample events have no project field, they all belong to Atlas. */
export const DEFAULT_PROJECT = 'atlas';

export type Cancellation = {
  reason: string;
  by: string;
  /** Only this occurrence of a recurring event; the next ones continue. */
  once: boolean;
};

/** Step 3 › Create tasks: the task numbers it made, who confirmed and when (ISO). */
export type EventOutcomes = { tasks: number[]; by: string; date: string };

/** An event as the screens see it: the shared sample, its extra fields, and what the forms and sheets change. */
export type EventItem = Omit<SampleEvent, 'type' | 'canceled'> &
  EventExtra & {
    type: EventType;
    /** Project id picked in the form; none = DEFAULT_PROJECT. */
    project?: string;
    canceled?: Cancellation;
    /** Who saved the Edit form last. */
    editor?: string;
    outcomes?: EventOutcomes;
  };

export type EventStatusLabel = 'Canceled' | 'Done' | 'Today' | 'Upcoming';

/** Status pill text: Canceled, Done, Today, or Upcoming. */
export const eventStatus = (e: EventItem): EventStatusLabel =>
  e.canceled ? 'Canceled' : e.status === 'Done' ? 'Done' : e.date === TODAY ? 'Today' : 'Upcoming';

/** Project name of an event: the one picked in its form, else Atlas. */
export function eventProject(e: EventItem): string {
  const id = e.project ?? DEFAULT_PROJECT;
  const p = PROJECTS.find((x) => x.id === id) ?? PROJECTS.find((x) => x.id === DEFAULT_PROJECT);
  if (!p) throw new Error(`Event "${e.id}" belongs to project "${id}", which is not in the sample`);
  return p.name;
}

/** "Wed, Oct 7". */
export const eventDate = (e: EventItem) => weekdayMonthDay(e.date);

/** Start time with its AM/PM ("2:00 PM"); a range crossing noon carries its own ("11:00 AM–12:00 PM"). */
export function eventStart(e: EventItem): string {
  const from = e.range.split('–')[0];
  return /M$/.test(from) ? from : `${from} ${e.range.slice(-2)}`;
}

/** End time ("3:00 PM"). */
export const eventEnd = (e: EventItem) => e.range.split('–')[1];

/** Location line: "Online" or "In person · Meeting Room 2". */
export const eventWhere = (e: EventItem) =>
  e.mode === 'Online' ? 'Online' : `${e.mode} · ${e.place}`;

/** True when a Done event's outcomes are confirmed: the kickoff sample, or confirmed in Step 3. */
export const isConfirmed = (e: EventItem) => e.id === EVENT_RESULTS.event || !!e.outcomes;

export type EventHref = `/events/${string}`;

/** Route that opens an event: not done → its detail; done → its results when confirmed, else Step 3. */
export function eventHref(e: EventItem): EventHref {
  if (e.status !== 'Done') return `/events/${e.id}`;
  return isConfirmed(e) ? `/events/${e.id}/results` : `/events/${e.id}/outcomes/3`;
}
