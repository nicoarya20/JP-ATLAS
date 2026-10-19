// Events ①b: the Filter & sort query — its options, applying it to the events, grouping them, and the calendar dots.
// A query lives in the list/calendar screen's params ({when, type, project, group}), so Apply is a go() to the same screen.
import { D } from '../../data/sample';
import { PROJECT, TYPES } from './events.shared';

/** Overlay options; index 0 is the default. */
export const WHEN = ['Upcoming', 'Past'];
const WHEN_PAST = 1;
export const TYPE_FILTERS = ['All', ...TYPES];
export const GROUPS = ['Schedule', 'Type'];
export const GROUP_TYPE = 1;

const KEYS = ['when', 'type', 'project', 'group'];
const REPEAT_DAYS = { 'every 2 weeks': 14 };   // how far apart a recurring event's next dates are

/** Query a list starts with: upcoming events, every type, every project, grouped by schedule. */
export const BASE_QUERY = { when: 0, type: 0, project: '', group: 0 };

/** Project picker options. */
export const projectOptions = () => [{ value: '', label: 'All projects' }, ...D.projects.map(p => ({ value: p.id, label: p.name }))];

/** Only the query keys of a params object. */
export const queryParams = params => Object.fromEntries(KEYS.filter(k => params?.[k] != null).map(k => [k, params[k]]));

/** Screen params with the query dropped, i.e. the list back at its default. */
export const withoutQuery = params => Object.fromEntries(Object.entries(params || {}).filter(([k]) => !KEYS.includes(k)));

/** Query from screen params, defaults filled in. */
export const queryOf = params => ({ ...BASE_QUERY, ...queryParams(params) });

/** True when the query narrows the events beyond the default (the dot on the filter icon): Past, a type or a project;
 *  Upcoming is the default and grouping alone does not count. */
export const isFiltered = q => !!(q.when || q.type || q.project);

/** Past: already done, or its first date is before today; everything else is upcoming. */
export const isPast = e => e.status === 'Done' || firstDate(e) < TODAY;

/** Events of the picked time (upcoming / past), type and project (every sample event belongs to PROJECT()). */
export function applyQuery(events, q) {
  const name = q.project && D.project(q.project)?.name;
  return events
    .filter(e => isPast(e) === (q.when === WHEN_PAST))
    .filter(e => !q.type || e.type === TYPE_FILTERS[q.type])
    .filter(() => !name || name === PROJECT());
}

/** [title, events] sections: by schedule (the events' own group, in data order) or by type (form order). */
export function groupEvents(events, q) {
  const keys = q.group === GROUP_TYPE ? TYPES.filter(t => events.some(e => e.type === t)) : [...new Set(events.map(e => e.group))];
  const of = q.group === GROUP_TYPE ? e => e.type : e => e.group;
  return keys.map(k => [k, events.filter(e => of(e) === k)]);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;
const [, TODAY_MON, TODAY_DAY, TODAY_YEAR] = D.today.date.match(/(\w{3}) (\d+), (\d{4})$/);

/** Today of the sample data ("Wednesday, Oct 7, 2026"), at midnight. */
export const TODAY = new Date(Number(TODAY_YEAR), MONTHS.indexOf(TODAY_MON), Number(TODAY_DAY));

/** An event's own date; every sample event starts in today's month ("Thu 8" → Oct 8, 2026). */
export const firstDate = e => (e.day === 'Today' ? TODAY
  : new Date(TODAY.getFullYear(), TODAY.getMonth(), Number(e.day.match(/\d+$/)[0])));

/** True when an event falls on date: its own date, or (recurring) every step days after it, into any later month. */
export function occursOn(e, date) {
  const gap = Math.round((date - firstDate(e)) / DAY_MS);   // round: a DST change makes a day 23 or 25 hours
  const step = REPEAT_DAYS[e.repeat];
  return gap === 0 || (!!step && gap > 0 && gap % step === 0);
}

/** Events falling on date, for the calendar dots and agenda. */
export const eventsOn = (events, date) => events.filter(e => occursOn(e, date));
