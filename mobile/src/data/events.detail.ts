// Events ③ detail and form getters (prototype events.detail.jsx / events.new.jsx): who may change an event, its
// attendees, and the initial New event / Edit form. Re-exported by events.ts.
import { addDays } from './events.dates';
import {
  DEFAULT_PROJECT,
  type EventItem,
  type EventStatusLabel,
  eventEnd,
  eventProject,
  eventStart,
  eventStatus,
  TYPES,
} from './events.shared';
import { type EventFields, findEvent } from './events.store';
import { me } from './people';
import { type Role, TODAY } from './sample';

export type EventAttendee = { name: string; creator: boolean; noteTaker: boolean };

export type EventDetailData = {
  event: EventItem;
  status: EventStatusLabel;
  project: string;
  /** May change the event: everyone but a Member, or the Member who created it. */
  editor: boolean;
  /** ⋯ items for an editor: Cancel event (not yet canceled) and Move to Archive; none for others. */
  menu: ('cancel' | 'archive')[];
  /** Why the viewer may (or may not) change it; null for a PM who did not create it. */
  access: 'creator' | 'admin' | 'member' | null;
  /** Creator first. */
  attendees: EventAttendee[];
};

/** Detail of event id for `role`; null when no such event. */
export function getEventDetail(role: Role, id: string): EventDetailData | null {
  const e = findEvent(id);
  if (!e) return null;
  const name = me(role).name;
  const editor = role !== 'member' || name === e.creator;
  const access =
    name === e.creator
      ? 'creator'
      : role === 'admin'
        ? 'admin'
        : role === 'member'
          ? 'member'
          : null;
  const people = [e.creator, ...e.attendees.filter((n) => n !== e.creator)];
  return {
    event: e,
    status: eventStatus(e),
    project: eventProject(e),
    editor,
    menu: !editor ? [] : e.canceled ? ['archive'] : ['cancel', 'archive'],
    access,
    attendees: people.map((n) => ({
      name: n,
      creator: n === e.creator,
      noteTaker: n === e.noteTaker,
    })),
  };
}

/** Initial New event / Edit form: event id filled in, or a blank Meeting tomorrow 10–11 AM with me attending. */
export function getEventForm(
  role: Role,
  id?: string,
): { fields: EventFields; creator: string } | null {
  const name = me(role).name;
  if (id == null) {
    return {
      creator: name,
      fields: {
        title: '',
        date: addDays(TODAY, 1),
        start: '10:00 AM',
        end: '11:00 AM',
        mode: 'In person',
        place: '',
        attendees: [name],
        type: TYPES[0],
        project: DEFAULT_PROJECT,
        agenda: [],
        repeat: '',
      },
    };
  }
  const e = findEvent(id);
  if (!e) return null;
  return {
    creator: e.creator,
    fields: {
      title: e.title,
      date: e.date,
      start: eventStart(e),
      end: eventEnd(e),
      mode: e.mode,
      place: e.place === 'Online' ? '' : e.place,
      attendees: e.attendees,
      type: e.type,
      project: e.project ?? DEFAULT_PROJECT,
      agenda: e.agenda ?? [],
      repeat: e.repeat ?? '',
    },
  };
}
