// Events ①b: the Filter & sort query — its options, applying it to the events, grouping them, and the calendar dots.
// A query lives in the list/calendar screen's params ({when, type, project, group}), so Apply is a go() to the same screen.
import { D } from '../../data/sample';
import { PROJECT, TYPES } from './events.shared';

/** Overlay options; index 0 is the default. */
export const WHEN = ['All', 'Upcoming', 'Past'];
const WHEN_PAST = 2;
export const TYPE_FILTERS = ['All', ...TYPES];
export const GROUPS = ['Schedule', 'Type'];
export const GROUP_TYPE = 1;

const KEYS = ['when', 'type', 'project', 'group'];
const REPEAT_DAYS = { 'every 2 weeks': 14 };   // how far apart a recurring event's next dates are

/** Query a list starts with: upcoming and past, every type, every project, grouped by schedule. */
export const BASE_QUERY = { when: 0, type: 0, project: '', group: 0 };

/** Project picker options. */
export const projectOptions = () => [{ value: '', label: 'All projects' }, ...D.projects.map(p => ({ value: p.id, label: p.name }))];

/** Only the query keys of a params object. */
export const queryParams = params => Object.fromEntries(KEYS.filter(k => params?.[k] != null).map(k => [k, params[k]]));

/** Screen params with the query dropped, i.e. the list back at its default. */
export const withoutQuery = params => Object.fromEntries(Object.entries(params || {}).filter(([k]) => !KEYS.includes(k)));

/** Query from screen params, defaults filled in. */
export const queryOf = params => ({ ...BASE_QUERY, ...queryParams(params) });

/** True when the query narrows the events (the dot on the filter icon); grouping alone does not count. */
export const isFiltered = q => !!(q.when || q.type || q.project);

/** Past: already done, or its first date is before today; everything else is upcoming. */
export const isPast = e => e.status === 'Done' || datesOf(e)[0] < TODAY_DATE;

/** Events of the picked time (upcoming / past), type and project (every sample event belongs to PROJECT()). */
export function applyQuery(events, q) {
  const name = q.project && D.project(q.project)?.name;
  return events
    .filter(e => !q.when || isPast(e) === (q.when === WHEN_PAST))
    .filter(e => !q.type || e.type === TYPE_FILTERS[q.type])
    .filter(() => !name || name === PROJECT());
}

/** [title, events] sections: by schedule (the events' own group, in data order) or by type (form order). */
export function groupEvents(events, q) {
  const keys = q.group === GROUP_TYPE ? TYPES.filter(t => events.some(e => e.type === t)) : [...new Set(events.map(e => e.group))];
  const of = q.group === GROUP_TYPE ? e => e.type : e => e.group;
  return keys.map(k => [k, events.filter(e => of(e) === k)]);
}

/** October date of today ("Wed, Oct 7" → 7); every sample event is in October 2026. */
export const TODAY_DATE = Number(D.today.short.match(/\d+$/)[0]);

/** October dates an event falls on: its own day, then its repeats within the month. */
export function datesOf(e) {
  const first = e.day === 'Today' ? TODAY_DATE : Number(e.day.match(/\d+$/)[0]);
  const step = REPEAT_DAYS[e.repeat];
  if (!step) return [first];
  return Array.from({ length: Math.floor((31 - first) / step) + 1 }, (_, i) => first + i * step);
}

/** Number of events per October date, for the calendar dots. */
export function eventsPerDate(events) {
  const count = {};
  for (const n of events.flatMap(datesOf)) count[n] = (count[n] || 0) + 1;
  return count;
}
