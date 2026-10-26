// The server's event DTOs turned into what the screens read: the labels, the day and the times in
// the team zone (K2), the capabilities carried through, and people matched by `userId` (K4).
import {
  agendaItems,
  agendaText,
  clockLabel,
  hour12,
  instantOfLocal,
  kindOfType,
  locationOfMode,
  modeOfLocation,
  rangeLabel,
  remindersLabel,
  time24,
  toServerEvent,
  toServerEventDetail,
} from '@/data/events.map';

import { detailItem, listItem } from '../helpers/events-server';
import { viewerNamed } from '../helpers/session-fixtures';

describe('one list row', () => {
  test('reads its day and times in the team zone, not in UTC', () => {
    // 07:00 UTC is 14:00 WIB on the same day; the labels are the prototype's own.
    const e = toServerEvent(listItem());
    expect(e).toMatchObject({
      id: 'e-review',
      date: '2026-10-07',
      time: '2:00',
      range: '2:00–3:00 PM',
      place: 'Meeting Room 2',
      mode: 'In person',
      type: 'Review',
    });
  });

  test('a morning event in WIB does not fall back to the day before', () => {
    // 23:30Z on the 26th is 06:30 WIB on the 27th. Read as UTC it would be the wrong day and the
    // wrong hour, which is the whole reason K2 exists.
    const e = toServerEvent(
      listItem({ startsAt: '2026-10-26T23:30:00.000Z', endsAt: '2026-10-27T00:30:00.000Z' }),
    );
    expect(e.date).toBe('2026-10-27');
    expect(e.time).toBe('6:30');
    expect(e.range).toBe('6:30–7:30 AM');
    expect(
      toServerEvent(listItem({ startsAt: '2026-10-26T23:30:00.000Z' }), { timeZone: 'UTC' }).date,
    ).toBe('2026-10-26');
  });

  test('a range crossing noon carries both meridiems', () => {
    const e = toServerEvent(
      listItem({ startsAt: '2026-10-07T04:00:00.000Z', endsAt: '2026-10-07T05:00:00.000Z' }),
    );
    expect(e.range).toBe('11:00 AM–12:00 PM');
  });

  test('status comes from the tab the server cut to, else from the day', () => {
    expect(toServerEvent(listItem(), { past: true }).status).toBe('Done');
    expect(toServerEvent(listItem(), { past: false }).status).toBe('Upcoming');
    // No tab (a calendar read): the day decides, against the server's today (2026-10-07).
    expect(toServerEvent(listItem()).status).toBe('Upcoming');
    expect(toServerEvent(listItem({ endsAt: '2026-10-01T08:00:00.000Z' })).status).toBe('Done');
  });

  test('an online event keeps its link apart from its place', () => {
    const e = toServerEvent(
      listItem({ locationType: 'online', locationText: null, meetingUrl: 'https://meet/x' }),
    );
    expect(e).toMatchObject({ mode: 'Online', place: 'Online', meetingUrl: 'https://meet/x' });
  });

  test('a personal event has no project instead of a made-up one', () => {
    const e = toServerEvent(listItem({ project: null }));
    expect(e.project).toBeUndefined();
    expect(e.projectName).toBeNull();
  });

  test('cancellation, guest counts, minutes status and can{} come through unchanged', () => {
    const e = toServerEvent(
      listItem({
        canceledAt: '2026-10-06T03:00:00.000Z',
        cancelReason: 'Ruang dipakai.',
        noteStatus: 'draft',
        can: { writeNote: true },
      }),
    );
    expect(e.canceled).toEqual({ reason: 'Ruang dipakai.', by: '' });
    expect(e.participantsTotal).toBe(3);
    expect(e.isParticipant).toBe(true);
    expect(e.noteStatus).toBe('draft');
    expect(e.can).toEqual({ writeNote: true });
  });
});

describe('one event detail', () => {
  test('puts the creator first and keeps names and ids in step', () => {
    const d = toServerEventDetail(detailItem());
    expect(d.attendees).toEqual(['Rina', 'Nico']);
    expect(d.attendeeIds).toEqual(['u-rina', 'u-nico']);
    expect(d.creator).toBe('Rina');
    expect(d.creatorId).toBe('u-rina');
    expect(d.participantsTotal).toBe(2);
  });

  test('"am I a guest" is answered by samePerson, not by name', () => {
    const nico = viewerNamed('Nico');
    expect(toServerEventDetail(detailItem(), { who: nico }).isParticipant).toBe(true);
    const others = detailItem({ participants: [{ id: 'u-sri', name: 'Sri' }], creator: null });
    expect(toServerEventDetail(others, { who: nico }).isParticipant).toBe(false);
    // Same display name, different account: the id decides (K4).
    const twin = detailItem({ creator: null, participants: [{ id: 'u-other', name: 'Nico' }] });
    expect(toServerEventDetail(twin, { who: nico }).isParticipant).toBe(false);
  });

  test('splits the agenda text into items and reads the canceller', () => {
    const d = toServerEventDetail(
      detailItem({
        canceledAt: '2026-10-06T03:00:00.000Z',
        cancelReason: 'Ruang dipakai.',
        canceledBy: { id: 'u-rina', name: 'Rina' },
      }),
    );
    expect(d.agenda).toEqual(['New onboarding flow', 'Feedback from the trial users']);
    expect(d.canceled).toEqual({ reason: 'Ruang dipakai.', by: 'Rina' });
    expect(d.updated).toBe('2026-10-07');
  });

  test('a detail with no creator still lists its guests', () => {
    const d = toServerEventDetail(detailItem({ creator: null }));
    expect(d.attendees).toEqual(['Rina', 'Nico']);
    expect(d.creator).toBe('');
    expect(d.attendees.every((_, at) => d.attendeeIds[at])).toBe(true);
  });
});

describe('labels and enums', () => {
  test('kinds and location types map both ways', () => {
    expect(kindOfType('Team event')).toBe('team');
    expect(kindOfType('Other')).toBe('other');
    expect(modeOfLocation('online')).toBe('Online');
    expect(modeOfLocation(null)).toBe('In person');
    expect(locationOfMode('Online')).toBe('online');
  });

  test('clock labels run 12-hour with midnight as 12', () => {
    expect(hour12('00:30')).toBe('12:30');
    expect(clockLabel('00:30')).toBe('12:30 AM');
    expect(clockLabel('12:05')).toBe('12:05 PM');
    expect(rangeLabel('14:00', '15:30')).toBe('2:00–3:30 PM');
    expect(() => hour12('nope')).toThrow(/24-hour clock time/);
  });

  test('agenda text and items round-trip, dropping numbering and blanks', () => {
    expect(agendaItems('1. One\n\n2. Two')).toEqual(['One', 'Two']);
    expect(agendaItems(null)).toEqual([]);
    expect(agendaText([])).toBeNull();
    expect(agendaText(['One', 'Two'])).toBe('One\nTwo');
  });

  test('reminder offsets read as one line, and say so when there are none', () => {
    expect(remindersLabel([1440, 30])).toBe('1 day & 30 min before');
    expect(remindersLabel([2880, 120])).toBe('2 days & 2 hours before');
    expect(remindersLabel([])).toBe('No reminder');
  });
});

describe('a wall-clock day and time back into an instant', () => {
  test('a WIB morning becomes the previous UTC day', () => {
    expect(instantOfLocal('2026-10-27', '06:30')).toBe('2026-10-26T23:30:00.000Z');
    expect(instantOfLocal('2026-10-07', '14:00')).toBe('2026-10-07T07:00:00.000Z');
    expect(instantOfLocal('2026-10-07', '00:00')).toBe('2026-10-06T17:00:00.000Z');
  });

  test('it is the inverse of reading an instant back', () => {
    const made = instantOfLocal('2026-01-01', '00:15');
    expect(toServerEvent(listItem({ startsAt: made, endsAt: made })).date).toBe('2026-01-01');
    expect(instantOfLocal('2026-06-15', '09:00', 'UTC')).toBe('2026-06-15T09:00:00.000Z');
  });

  test('a clock label converts back to 24 hours, and a bad one is refused', () => {
    expect(time24('12:00 AM')).toBe('00:00');
    expect(time24('12:30 PM')).toBe('12:30');
    expect(time24('2:00 PM')).toBe('14:00');
    expect(() => time24('14:00')).toThrow(/clock time/);
  });
});
