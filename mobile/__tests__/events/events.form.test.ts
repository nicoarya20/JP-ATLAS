// The New event / Edit form: its option lists, what makes it saveable, and the request bodies it
// becomes. The day is the prototype's Wed, 7 Oct 2026, from the server's clock (K1).
import {
  agendaLines,
  createBodyOf,
  type EventFormFields,
  formDates,
  formDueDates,
  guestDiff,
  MODES,
  savedFields,
  TIMES,
  updateBodyOf,
  validateEvent,
} from '@/data/events.form';
import { EVENT_TITLE_MAX } from '@/data/events.wire';

const FORM: EventFormFields = {
  title: '  Retro ',
  date: '2026-10-09',
  start: '11:00 AM',
  end: '12:00 PM',
  mode: 'In person',
  place: ' Room 3 ',
  meetingUrl: '',
  guests: [{ userId: 'u-nico', name: 'Nico' }],
  type: 'Meeting',
  project: 'p-atlas',
  agenda: '',
};

describe('the option lists', () => {
  test('times run 7:00 AM to 9:00 PM every 15 minutes', () => {
    expect(TIMES).toHaveLength(57);
    expect(TIMES.slice(0, 3)).toEqual(['7:00 AM', '7:15 AM', '7:30 AM']);
    expect(TIMES).toContain('12:00 PM');
    expect(TIMES[TIMES.length - 1]).toBe('9:00 PM');
  });

  test('dates run from today to the end of October', () => {
    expect(formDates()).toHaveLength(25);
    expect(formDates()[0]).toEqual({ value: '2026-10-07', label: 'Wed, Oct 7' });
    expect(formDates()[24]).toEqual({ value: '2026-10-31', label: 'Sat, Oct 31' });
    expect(formDueDates()[2]).toEqual({ value: '2026-10-09', label: 'Oct 9' });
    expect(MODES).toEqual(['In person', 'Online']);
  });
});

describe('what makes it saveable', () => {
  test('needs a title and an end after the start', () => {
    expect(validateEvent(FORM)).toEqual({ ok: true, timeOk: true, tooLong: null });
    expect(validateEvent({ ...FORM, title: '   ' }).ok).toBe(false);
    expect(validateEvent({ ...FORM, end: '11:00 AM' })).toMatchObject({ ok: false, timeOk: false });
    expect(validateEvent({ ...FORM, start: '2:00 PM', end: '1:45 PM' }).timeOk).toBe(false);
  });

  test("refuses what the server's own limits would refuse, before sending it", () => {
    const long = { ...FORM, title: 'x'.repeat(EVENT_TITLE_MAX + 1) };
    expect(validateEvent(long)).toMatchObject({ ok: false, tooLong: 'title' });
    expect(validateEvent({ ...FORM, place: 'x'.repeat(201) }).tooLong).toBe('place');
    expect(
      validateEvent({ ...FORM, mode: 'Online', meetingUrl: `https://${'x'.repeat(500)}` }).tooLong,
    ).toBe('meetingUrl');
    expect(validateEvent({ ...FORM, agenda: 'x'.repeat(5001) }).tooLong).toBe('agenda');
    const crowd = Array.from({ length: 101 }, (_, i) => ({ userId: `u-${i}`, name: `P${i}` }));
    expect(validateEvent({ ...FORM, guests: crowd }).tooLong).toBe('guests');
  });

  test('Save trims the fields, and keeps the link and the place apart', () => {
    expect(agendaLines('1. Wins\n\n2.  Fixes \n  Next sprint')).toEqual([
      'Wins',
      'Fixes',
      'Next sprint',
    ]);
    expect(savedFields(FORM)).toMatchObject({ title: 'Retro', place: 'Room 3', meetingUrl: '' });
    const online = savedFields({ ...FORM, mode: 'Online', meetingUrl: ' https://meet/x ' });
    expect(online).toMatchObject({ place: '', meetingUrl: 'https://meet/x' });
  });
});

describe('the request bodies', () => {
  test('a new event sends instants in the team zone, the kind, the place and its guests', () => {
    // 11:00 AM WIB on 9 Oct is 04:00Z the same day (K2).
    expect(createBodyOf(FORM)).toEqual({
      title: 'Retro',
      startsAt: '2026-10-09T04:00:00.000Z',
      endsAt: '2026-10-09T05:00:00.000Z',
      kind: 'meeting',
      locationType: 'offline',
      locationText: 'Room 3',
      meetingUrl: null,
      agenda: null,
      projectId: 'p-atlas',
      participantIds: ['u-nico'],
    });
  });

  test('an online event sends the link and no written place', () => {
    const body = createBodyOf({ ...FORM, mode: 'Online', meetingUrl: 'https://meet/x' });
    expect(body).toMatchObject({
      locationType: 'online',
      locationText: null,
      meetingUrl: 'https://meet/x',
    });
  });

  test('no project means a personal event, sent as null rather than left out', () => {
    expect(createBodyOf({ ...FORM, project: null }).projectId).toBeNull();
  });

  test('the agenda goes as one text, and an empty one as null', () => {
    expect(createBodyOf({ ...FORM, agenda: '1. Wins\n\nFixes' }).agenda).toBe('Wins\nFixes');
    expect(createBodyOf({ ...FORM, agenda: '   ' }).agenda).toBeNull();
  });

  test('an edit carries neither the project nor the guest list: the server refuses both', () => {
    const body = updateBodyOf(FORM) as Record<string, unknown>;
    expect(body).not.toHaveProperty('projectId');
    expect(body).not.toHaveProperty('participantIds');
    expect(body).toMatchObject({ title: 'Retro', kind: 'meeting' });
  });

  test('guest changes come out as who to invite and who to remove', () => {
    const before = [
      { userId: 'u-rina', name: 'Rina' },
      { userId: 'u-nico', name: 'Nico' },
    ];
    const after = [
      { userId: 'u-rina', name: 'Rina' },
      { userId: 'u-sri', name: 'Sri' },
    ];
    expect(guestDiff(before, after)).toEqual({ add: ['u-sri'], remove: ['u-nico'] });
    expect(guestDiff(before, before)).toEqual({ add: [], remove: [] });
  });
});
