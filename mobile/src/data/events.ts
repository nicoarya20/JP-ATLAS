// Events data per screen, from `/api/app/events` (map `phase2-map-events.md`): the list and the calendar are hooks that
// fetch what they show (events.list.ts, events.calendar.ts), the detail a view of one event (events.detail.ts). The
// sample store (events.store.ts) is left only for the screens still on sample data: the hidden record / outcomes /
// results flow (E-1), the profile calendar and Archive.
export {
  type CalendarDay,
  type CalendarView,
  type EventsCalendarView,
  stepCalendar,
  useEventsCalendar,
} from './events.calendar';
export { type EventDetailView, type EventGuest, eventDetailOf } from './events.detail';
export { type EventCard, type EventsListView, useEventsList } from './events.list';
export type { EventRow } from './events.view';
