// Events data per screen, the swap point to the API: today each getter reads the in-memory events store
// (events.store.ts), in Phase 2 it becomes a fetch of /api/app/events… returning the same shape. Screens re-render
// through useEventsState() / useEventsQuery() and call these getters for what they show. The getters live per screen
// in events.list.ts, events.calendar.ts and events.detail.ts; outcomes and results: events.results.ts.
export {
  type AgendaItem,
  type CalendarDay,
  type CalendarView,
  type EventsCalendarData,
  getEventsCalendar,
  stepCalendar,
} from './events.calendar';
export {
  type EventAttendee,
  type EventDetailData,
  getEventDetail,
  getEventForm,
} from './events.detail';
export { type EventCard, type EventsListData, getEventsList } from './events.list';
