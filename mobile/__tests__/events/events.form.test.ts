// The New event / Edit form against the server (map §3): what Save waits for, the create body, and an edit that sends
// only what changed. Times are the team's (Asia/Jakarta, UTC+7); today is Wed, Oct 7, 2026.
import {
  blankEvent,
  checkEvent,
  createBody,
  type EventForm,
  eventFormOf,
  guestChange,
  TIMES,
  timeOptions,
  updateBody,
} from '../../src/data/events.form';
import { DODI, NICO, RINA, reviewDetail } from '../helpers/events-fixtures';

const JAKARTA = 'Asia/Jakarta';
const form = (over: Partial<EventForm> = {}): EventForm => ({
  ...blankEvent(),
  title: 'Design sync',
  ...over,
});

describe('event form', () => {
  test('a new event starts today 9–10 AM, in person, personal, with nobody else', () => {
    expect(blankEvent()).toEqual({
      title: '',
      date: '2026-10-07',
      start: '9:00 AM',
      end: '10:00 AM',
      span: 0,
      mode: 'In person',
      place: '',
      link: '',
      guests: [],
      type: 'Meeting',
      projectId: null,
      agenda: '',
    });
  });

  test('times run 7 AM to 9 PM every 15 minutes; an edited time off the list stays on top', () => {
    expect([TIMES.length, TIMES[0], TIMES[TIMES.length - 1]]).toEqual([57, '7:00 AM', '9:00 PM']);
    expect(timeOptions('9:00 AM')).toHaveLength(57);
    expect(timeOptions('6:40 AM')[0]).toEqual({ value: '6:40 AM', label: '6:40 AM' });
  });

  test('Save waits for a title, an end after the start, and a web link', () => {
    expect(checkEvent(form()).ok).toBe(true);
    expect(checkEvent(form({ title: '  ' }))).toMatchObject({ ok: false, titleOk: false });
    expect(checkEvent(form({ end: '9:00 AM' }))).toMatchObject({ ok: false, timeOk: false });
    // Past midnight the end is on a later day, so an earlier clock time is fine.
    expect(checkEvent(form({ start: '10:00 PM', end: '1:00 AM', span: 1 })).timeOk).toBe(true);
    const online = form({ mode: 'Online', link: 'meet.example.com' });
    expect(checkEvent(online)).toMatchObject({ ok: false, linkOk: false });
    expect(checkEvent({ ...online, link: 'https://meet.example.com' }).ok).toBe(true);
    // A link typed in person is not sent, so it does not block Save.
    expect(checkEvent(form({ link: 'nope' })).ok).toBe(true);
  });

  test('create sends team-zone instants, the place or the link, and the guests only when there are some', () => {
    expect(createBody(form({ place: ' Room 3 ', agenda: ' ' }), JAKARTA)).toEqual({
      title: 'Design sync',
      startsAt: '2026-10-07T02:00:00.000Z',
      endsAt: '2026-10-07T03:00:00.000Z',
      kind: 'meeting',
      locationType: 'offline',
      locationText: 'Room 3',
      meetingUrl: null,
      agenda: null,
      projectId: null,
    });
    const online = form({
      mode: 'Online',
      place: 'Room 3',
      link: 'https://meet.example.com',
      guests: [RINA],
      type: 'Team event',
      projectId: 'p-atlas',
    });
    expect(createBody(online, JAKARTA)).toMatchObject({
      kind: 'team',
      locationType: 'online',
      locationText: null,
      meetingUrl: 'https://meet.example.com',
      projectId: 'p-atlas',
      participantIds: ['u-rina'],
    });
  });

  test('an edit starts from the event, the creator left out of the guests', () => {
    expect(eventFormOf(reviewDetail(), JAKARTA)).toEqual({
      title: 'Onboarding design review',
      date: '2026-10-07',
      start: '2:00 PM',
      end: '3:00 PM',
      span: 0,
      mode: 'In person',
      place: 'Meeting Room 2',
      link: '',
      guests: [RINA, DODI],
      type: 'Review',
      projectId: 'p-atlas',
      agenda: '1. Walk through the flow\n2. Decide the copy',
    });
  });

  test('an edit sends only what changed; an untouched one sends nothing', () => {
    const was = eventFormOf(reviewDetail(), JAKARTA);
    expect(updateBody(was, { ...was }, JAKARTA)).toEqual({});
    expect(updateBody(was, { ...was, title: 'Review v2', end: '3:30 PM' }, JAKARTA)).toEqual({
      title: 'Review v2',
      endsAt: '2026-10-07T08:30:00.000Z',
    });
    expect(updateBody(was, { ...was, date: '2026-10-09' }, JAKARTA)).toEqual({
      startsAt: '2026-10-09T07:00:00.000Z',
      endsAt: '2026-10-09T08:00:00.000Z',
    });
  });

  test('guests who join and who leave', () => {
    expect(guestChange([RINA, DODI], [DODI, NICO])).toEqual({
      add: ['u-nico'],
      remove: ['u-rina'],
    });
    expect(guestChange([RINA], [RINA])).toEqual({ add: [], remove: [] });
  });
});
