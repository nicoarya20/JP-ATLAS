/**
 * Events ④ detail from `GET /api/app/events/:id` (map §2b): the facts, the guests (creator first), the agenda, the
 * minutes and the footer, in the app's words. What the viewer may do comes from the event's `can{}`, never the role.
 */
import { monthDay, weekdayMonthDay } from './dates';
import { KIND_LABEL } from './events.query';
import type { EventStatusLabel } from './events.shared';
import { reminderLabel, timeRange } from './events.time';
import { eventDays, eventStatusOf, NOTE_LABEL, whereOf } from './events.view';
import type { EventCapsWire, EventDetailWire, EventProjectWire } from './events.wire';
import { instantDate } from './instant';

export type EventGuest = { id: string; name: string; creator: boolean };

export type EventDetailView = {
  id: string;
  title: string;
  status: EventStatusLabel;
  type: string;
  canceled: { by: string | null; reason: string } | null;
  /** "Wed, Oct 7 · 2:00–3:00 PM". */
  time: string;
  where: string;
  /** The meeting link of an online event, opened from the facts. */
  link: string | null;
  /** Null for a personal event. */
  project: EventProjectWire | null;
  reminder: string;
  guests: EventGuest[];
  agenda: string[];
  minutes: { status: string; body: string } | null;
  /** "Created by Nico Arya · Updated Oct 7" (the server does not say who updated it, E-4). */
  footer: string;
  can: EventCapsWire;
};

export const PERSONAL = 'Personal event';
export const NONE_YET = 'None yet';

/** Agenda points, one per line; a leading "1. " numbering and blank lines are dropped. */
export const agendaLines = (text: string | null) =>
  (text ?? '')
    .split('\n')
    .map((a) => a.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

/** The detail of event e. */
export function eventDetailOf(e: EventDetailWire): EventDetailView {
  const creatorId = e.creator?.id;
  const guests = [...e.participants].sort(
    (a, b) => Number(b.id === creatorId) - Number(a.id === creatorId),
  );
  const created = e.creator ? `Created by ${e.creator.name}` : null;
  return {
    id: e.id,
    title: e.title,
    status: eventStatusOf(e),
    type: KIND_LABEL[e.kind],
    canceled: e.canceledAt
      ? { by: e.canceledBy?.name ?? null, reason: e.cancelReason ?? '' }
      : null,
    time: `${weekdayMonthDay(eventDays(e).start)} · ${timeRange(e.startsAt, e.endsAt)}`,
    where: whereOf(e),
    link: e.locationType === 'online' ? e.meetingUrl : null,
    project: e.project,
    reminder: reminderLabel(e.remindersMinutes),
    guests: guests.map((p) => ({ id: p.id, name: p.name, creator: p.id === creatorId })),
    agenda: agendaLines(e.agenda),
    minutes: e.note ? { status: NOTE_LABEL[e.note.status], body: e.note.body } : null,
    footer: [created, `Updated ${monthDay(instantDate(e.updatedAt))}`].filter(Boolean).join(' · '),
    can: e.can,
  };
}
