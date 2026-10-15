// Events helpers shared by the events screens and Inbox: dates, times, place, and which screen an event or task opens.
import { D } from '../../data/sample';

/** Project of every sample event (D.events have no project field; all belong to Atlas). */
export const PROJECT = () => D.project('atlas').name;

/** Event types offered by the new-event form, in form order. */
export const TYPES = ['Meeting', 'Review', 'Important', 'Team event', 'Other'];

export const EV = {
  /** Status pill text: Done, Today, or Upcoming. */
  status: e => (e.status === 'Done' ? 'Done' : e.day === 'Today' ? 'Today' : 'Upcoming'),
  /** "Wed, Oct 7" from D's day ("Today" / "Fri 9"); every sample event is in October 2026. */
  date: e => (e.day === 'Today' ? D.today.short : e.day.replace(/^(\w+) (\d+)$/, '$1, Oct $2')),
  /** Start time with its AM/PM ("2:00 PM"). */
  start: e => `${e.range.split('–')[0]} ${e.range.slice(-2)}`,
  /** End time ("3:00 PM"). */
  end: e => e.range.split('–')[1],
  /** Location line: "Online" or "In person · Meeting Room 2". */
  where: e => (e.mode === 'Online' ? 'Online' : `${e.mode} · ${e.place}`),
  /** True when a Done event's outcomes are confirmed; D.kickoff holds the only confirmed sample. */
  confirmed: e => e.id === 'kickoff',
  /** Outcomes screen of a Done event: confirmed detail, else step 3 (PM checks, Member waits). */
  results: e => (EV.confirmed(e) ? 'events.detail-confirmed' : 'events.step3'),
  /** Detail screen of a not-yet-done event (recurring events have their own). */
  detail: e => (e.repeat ? 'events.detail-recurring' : 'events.detail-upcoming'),
};

/** Task detail screen for a D.tasks item, picked by status (same rule as the Tasks module). */
export const taskScreen = t => (t.status === 'In review' ? 'tasks.detail-review'
  : t.status === 'In progress' || t.status === 'Done' ? 'tasks.detail-progress' : 'tasks.detail-todo');

/** Pill tone per event status. */
export const STATUS_TONE = { Done: 'success', Today: 'accent', Upcoming: 'neutral' };
