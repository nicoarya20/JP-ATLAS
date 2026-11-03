// Pull to refresh on the Events tab: the list page or the calendar window on screen, asked again (a list from page one,
// as many rows as are shown, tasks.paged.ts). Reloads, not invalidations: an event a teammate added is a change no
// write in this app marked stale.

import { eventsListResource } from './events.api';
import { type CalendarPick, calendarWindow } from './events.calendar';
import { type EventsQuery, eventsParams } from './events.query';

/** Reloads what the Events tab shows; settles once the request has (a failure stays on screen). */
export function refreshEvents(
  view: 'list' | 'calendar',
  { query, search, pick }: { query: EventsQuery; search: string; pick: CalendarPick },
) {
  return view === 'list'
    ? eventsListResource(eventsParams(query, search)).reload()
    : calendarWindow({ ...pick, query }).res.reload();
}
