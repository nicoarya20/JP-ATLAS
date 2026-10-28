// Events names shared by the events screens and the profile calendar: the form's event types, the status pill text
// and the route an event opens. Ported from the prototype's events.shared.js.

/** Event types offered by the new-event form, in form order. */
export const TYPES = ['Meeting', 'Review', 'Important', 'Team event', 'Other'] as const;
export type EventType = (typeof TYPES)[number];

export type EventStatusLabel = 'Canceled' | 'Done' | 'Today' | 'Upcoming';

/** Route that opens an event: its detail. */
export type EventHref = `/events/${string}`;
