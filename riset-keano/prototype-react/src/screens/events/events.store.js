// Event changes: New event / Edit save the form, ⋯ › Cancel marks the event Canceled (one occurrence or the series),
// ⋯ › Move to Archive moves it (or one occurrence) to Archive until Undo restores it, and Step 3 › Create tasks confirms
// its outcomes as tasks. Readers re-render through useEvents(); a page reload brings the sample back.
import { useSyncExternalStore } from 'react';
import { D } from '../../data/sample';
import { TODAY_LABEL, addTask } from '../tasks/tasks.store';
import { REPEAT_DAYS, TODAY, firstDate } from './events.query';
import { EV } from './events.shared';

const LOCALE = 'en-US';
const ORIGINAL = structuredClone(D.events);
let version = 0;
let added = 0;
const listeners = new Set();
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => { version += 1; listeners.forEach(fn => fn()); };

/** Date n of today's month (every sample event is in October 2026). */
export const dateOn = n => new Date(TODAY.getFullYear(), TODAY.getMonth(), n);
/** "Thu, Oct 8". */
export const dateLabel = d => d.toLocaleDateString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });

/** List group of a date: Earlier · / Today · / Tomorrow · <date>, This week (up to Sunday), else Later. */
export function groupOf(d) {
  const gap = d.getDate() - TODAY.getDate();
  if (gap < 0) return `Earlier · ${dateLabel(d)}`;
  if (gap === 0) return `Today · ${dateLabel(d)}`;
  if (gap === 1) return `Tomorrow · ${dateLabel(d)}`;
  return gap <= 6 - (TODAY.getDay() + 6) % 7 ? 'This week' : 'Later';
}

/** Put e on date n of the month: its day label ("Today" / "Thu 8") and list group. */
function placeOn(e, n) {
  const d = dateOn(n);
  e.day = n === TODAY.getDate() ? 'Today' : `${d.toLocaleDateString(LOCALE, { weekday: 'short' })} ${n}`;
  e.group = groupOf(d);
}

/** Insert e after the last event on or before its date, so the list groups stay in date order. */
function insert(e) {
  const at = D.events.findLastIndex(x => firstDate(x) <= firstDate(e));
  D.events.splice(at + 1, 0, e);
}

function take(id) {
  const i = D.events.findIndex(e => e.id === id);
  if (i < 0) throw new Error(`Event "${id}" is not in the event list`);
  return D.events.splice(i, 1)[0];
}

/** "2:00–3:00 PM", or "11:00 AM–12:00 PM" when the times cross noon. */
const rangeOf = (start, end) => (start.slice(-2) === end.slice(-2) ? `${start.slice(0, -3)}–${end}` : `${start}–${end}`);

/** Write the form fields into e: title, date (day of the month), start/end ("2:00 PM"), mode, place, attendees, type, project, agenda, repeat. */
function write(e, { date, start, end, repeat, ...rest }) {
  Object.assign(e, rest, { time: start.split(' ')[0], range: rangeOf(start, end) });
  if (repeat) e.repeat = repeat;
  else delete e.repeat;
  placeOn(e, date);
}

/** Add an upcoming event from the New event form; creator is its first attendee. Returns the new event's id. */
export function addEvent(fields, creator) {
  added += 1;
  const e = { id: `new-${added}`, status: 'Upcoming', creator, updated: TODAY_LABEL };
  write(e, fields);
  e.attendees = [creator, ...e.attendees.filter(n => n !== creator)];
  insert(e);
  notify();
  return e.id;
}

/** Save the Edit form of event id (same fields as addEvent); the event moves if its date changed. */
export function editEvent(id, fields, editor) {
  const e = take(id);
  write(e, fields);
  Object.assign(e, { updated: TODAY_LABEL, editor });
  insert(e);
  notify();
}

/** Cancel event id: it stays listed, marked Canceled with the reason. once = only this occurrence of a recurring event. */
export function cancelEvent(id, reason, by, { once = false } = {}) {
  const e = D.event(id);
  if (!e) throw new Error(`Cannot cancel event "${id}": no such event`);
  e.canceled = { reason, by, once: once && !!e.repeat };
  notify();
}

/**
 * Move event id to Archive. once (recurring only) archives just its next occurrence: the series moves on to the one
 * after, and Archive lists the occurrence with the date it had.
 */
export function archiveEvent(id, by, { once = false } = {}) {
  const e = D.event(id);
  if (!e || !D.events.includes(e)) throw new Error(`Cannot archive event "${id}": not in the event list`);
  const entry = { kind: 'EVENT', title: e.title, where: EV.project(e), by, date: TODAY_LABEL, event: id };
  const from = firstDate(e).getDate();
  if (once && REPEAT_DAYS[e.repeat]) {
    take(id);
    placeOn(e, from + REPEAT_DAYS[e.repeat]);
    delete e.canceled;
    insert(e);
    Object.assign(entry, { title: `${e.title} · ${dateLabel(dateOn(from))}`, from });
  } else {
    D.archivedEvents.push(take(id));
  }
  D.archive.unshift(entry);
  notify();
}

/** Undo / Restore of event id: back in the list (an archived occurrence puts the series back on its date). */
export function restoreEvent(id) {
  const i = D.archive.findIndex(a => a.event === id);
  if (i < 0) throw new Error(`Cannot restore event "${id}": not in Archive`);
  const [entry] = D.archive.splice(i, 1);
  const a = D.archivedEvents.findIndex(e => e.id === id);
  const e = a < 0 ? take(id) : D.archivedEvents.splice(a, 1)[0];
  if (entry.from != null) placeOn(e, entry.from);
  insert(e);
  notify();
}

/**
 * Step 3 › Create tasks for event id: each draft ({title, who, due}) becomes a To do task in the project, the event is
 * Done and its outcomes confirmed by `by`. Returns the new task numbers.
 */
export function confirmOutcomes(id, drafts, by) {
  const e = D.event(id);
  if (!e) throw new Error(`Cannot confirm the outcomes of event "${id}": no such event`);
  const tasks = drafts.map(d => addTask({ title: d.title, project: EV.project(e), who: d.who, due: d.due, priority: 'Medium', type: 'Task', tags: [] },
    { desc: `From the meeting "${e.title}"` }, by));
  Object.assign(e, { status: 'Done', outcomes: { tasks, by, date: TODAY_LABEL } });
  notify();
  return tasks;
}

/** Every event back to the sample; added ones are dropped, archived ones come back. test-only */
export function resetEvents() {
  D.events.splice(0, D.events.length, ...structuredClone(ORIGINAL));
  D.archivedEvents.length = 0;
  D.archive.splice(0, D.archive.length, ...D.archive.filter(a => a.event == null));
  added = 0;
  notify();
}

/** Re-render the caller after every event change; returns a counter that changes per change. */
export const useEvents = () => useSyncExternalStore(subscribe, () => version);
