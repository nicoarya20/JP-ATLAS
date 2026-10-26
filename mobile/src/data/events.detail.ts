// Events ④ detail and ③ form getters (prototype events.detail.jsx / events.new.jsx): what the
// viewer may do with an event, its guest list, and the initial New event / Edit form.
// Re-exported by events.ts.
//
// Permissions are the server's: every control below reads a key of `can{}` through
// `events.caps.ts`. There is no role test here, and there must not be one — a personal event, a
// project manager who did not create it, and a super-admin impersonating someone all come out
// wrong when the client guesses (map §3).
import { today } from './clock';
import { eventDetailResource } from './events.api';
import type { CapState } from './events.caps';
import { eventCap, eventCapReason } from './events.caps';
import { addDays } from './events.dates';
import type { EventFormFields, FormGuest } from './events.form';
import { agendaText, clockLabel, type ServerEventDetail, toServerEventDetail } from './events.map';
import { type EventStatusLabel, eventStatus, TYPES } from './events.shared';
import { instantTime } from './instant';
import type { Role } from './sample';
import { samePerson, viewer as signedIn } from './viewer';

/** One row of the Attendees section. `userId` is the identity, `name` only the label (K4). */
export type EventAttendee = { userId: string; name: string; creator: boolean };

/** A ⋯ menu item the server allows, with the reason when it is shown but not usable. */
export type EventMenuItem = {
  action: 'cancel' | 'archive';
  enabled: boolean;
  reason: string | null;
};

export type EventDetailData = {
  event: ServerEventDetail;
  status: EventStatusLabel;
  /** Project name, or null for a personal event (B4): no project row is drawn then. */
  project: string | null;
  /** Edit button: hidden, enabled, or shown disabled with the server's reason. */
  edit: CapState;
  editReason: string | null;
  /** ⋯ items the server allows; empty = no menu at all. */
  menu: EventMenuItem[];
  /** The Minutes box: `writeNote` reaches guests too, not only managers. */
  writeNote: CapState;
  /** Why the viewer may (or may not) change it; from `can.update` and the creator, never the role. */
  access: 'creator' | 'manager' | 'guest';
  /** Creator first. */
  attendees: EventAttendee[];
};

const menuOf = (d: ServerEventDetail): EventMenuItem[] => {
  const items: { action: 'cancel' | 'archive'; key: 'cancel' | 'trash' }[] = [
    { action: 'cancel', key: 'cancel' },
    { action: 'archive', key: 'trash' },
  ];
  return items
    .filter(({ key }) => eventCap(d.can, key) !== 'hidden')
    .map(({ action, key }) => ({
      action,
      enabled: eventCap(d.can, key) === 'enabled',
      reason: eventCapReason(d.can, key),
    }));
};

/**
 * Detail of event id, or null while it has not been read (the screen shows the resource's phase).
 * `role` is still taken and unused — `phase2-gap-disembunyikan.md` §4.1.
 */
export function getEventDetail(role: Role, id: string): EventDetailData | null {
  const dto = eventDetailResource(id).current();
  if (!dto) return null;
  const who = signedIn(role);
  const event = toServerEventDetail(dto, { who });
  const mine = samePerson(event.creatorId, who);
  return {
    event,
    status: eventStatus(event),
    project: event.projectName,
    edit: eventCap(event.can, 'update'),
    editReason: eventCapReason(event.can, 'update'),
    menu: menuOf(event),
    writeNote: eventCap(event.can, 'writeNote'),
    access: mine ? 'creator' : eventCap(event.can, 'update') === 'enabled' ? 'manager' : 'guest',
    attendees: event.attendees.map((name, at) => ({
      name,
      userId: event.attendeeIds[at] ?? '',
      creator: !!event.creatorId && event.attendeeIds[at] === event.creatorId,
    })),
  };
}

export type { FormGuest };

export type EventFormData = {
  fields: EventFormFields;
  /** The creator's `userId`: their pill cannot be removed. Empty for a new event (it is me). */
  creatorId: string;
  /** Editing an existing event; a new one sends everything in one `POST`. */
  editing: boolean;
  /** May be saved: `can.update` for an edit, and always for a new event (`caps.createEvent` gates the button). */
  save: CapState;
  saveReason: string | null;
};

/** A blank Meeting tomorrow 10–11 AM, with me as its one guest. */
function blankForm(): EventFormData {
  const who = signedIn();
  return {
    creatorId: who.userId,
    editing: false,
    save: 'enabled',
    saveReason: null,
    fields: {
      title: '',
      date: addDays(today(), 1),
      start: '10:00 AM',
      end: '11:00 AM',
      mode: 'In person',
      place: '',
      meetingUrl: '',
      guests: [{ userId: who.userId, name: who.name }],
      type: TYPES[0],
      project: null,
      agenda: '',
    },
  };
}

/**
 * Initial New event / Edit form. Without an id a blank one; with an id the event's own fields, or
 * null while its detail has not been read.
 */
export function getEventForm(role: Role, id?: string): EventFormData | null {
  if (id == null) return blankForm();
  const dto = eventDetailResource(id).current();
  if (!dto) return null;
  const e = toServerEventDetail(dto, { who: signedIn(role) });
  return {
    creatorId: e.creatorId ?? '',
    editing: true,
    save: eventCap(e.can, 'update'),
    saveReason: eventCapReason(e.can, 'update'),
    fields: {
      title: e.title,
      date: e.date,
      start: clockLabel(instantTime(e.startsAt)),
      end: clockLabel(instantTime(e.endsAt)),
      mode: e.mode,
      place: e.mode === 'Online' ? '' : e.place,
      meetingUrl: e.meetingUrl ?? '',
      guests: e.attendees.map((name, at) => ({ name, userId: e.attendeeIds[at] ?? '' })),
      type: e.type,
      project: e.project ?? null,
      agenda: agendaText(e.agenda ?? []) ?? '',
    },
  };
}
