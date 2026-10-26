// Events data per screen. Phase 2 swapped the sample for the server: `events.api.ts` fetches
// `/api/app/events*` into resources, `events.map.ts` turns its DTOs into the shape the screens read,
// and the getters below stay synchronous reads of what is held (`mobile/docs/phase2-pola-data.md`).
// Screens ask for the data with `syncEventsList` / `syncEventsWindow` / `eventDetailResource` and
// watch the resource's phase for loading and failure.
//
// The getters live per screen in events.list.ts, events.calendar.ts and events.detail.ts; the
// recording, outcomes and results screens still read the sample (events.results.ts), because they
// have no server side at all — GAP-A8.
export {
  type AgendaItem,
  type CalendarDay,
  type CalendarView,
  type EventsCalendarData,
  getEventsCalendar,
  stepCalendar,
  windowKeyOf,
} from './events.calendar';
export {
  type EventAttendee,
  type EventDetailData,
  type EventFormData,
  type EventMenuItem,
  type FormGuest,
  getEventDetail,
  getEventForm,
} from './events.detail';
export { type EventCard, type EventsListData, getEventsList } from './events.list';
export type { ServerEvent, ServerEventDetail } from './events.map';
