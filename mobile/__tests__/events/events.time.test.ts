// How an event from the server reads on the phone (K1): every instant in the team's zone (the test clock's
// Asia/Jakarta, UTC+7), "today" the server's Wed, Oct 7, 2026, never the device's.
import { eventDetailOf } from '../../src/data/events.detail';
import {
  clockOf,
  dayAndClock,
  reminderLabel,
  timeRange,
  zonedInstant,
} from '../../src/data/events.time';
import { eventStatusOf, rowOf, whereOf } from '../../src/data/events.view';
import { RINA, reviewDetail, reviewItem, syncItem } from '../helpers/events-fixtures';

const JAKARTA = 'Asia/Jakarta';

describe('event times', () => {
  test('clock times and the day an instant falls on in the team zone', () => {
    expect([clockOf(0), clockOf(545), clockOf(720), clockOf(1439)]).toEqual([
      '12:00 AM',
      '9:05 AM',
      '12:00 PM',
      '11:59 PM',
    ]);
    // 23:30Z is already the next morning in Jakarta.
    expect(dayAndClock('2026-10-07T23:30:00.000Z', JAKARTA)).toEqual({
      date: '2026-10-08',
      clock: '6:30 AM',
    });
  });

  test('ranges share AM/PM, name both across noon, and the end day past midnight', () => {
    expect(timeRange('2026-10-07T07:00:00Z', '2026-10-07T08:00:00Z')).toBe('2:00–3:00 PM');
    expect(timeRange('2026-10-07T04:00:00Z', '2026-10-07T05:00:00Z')).toBe('11:00 AM–12:00 PM');
    expect(timeRange('2026-10-08T15:00:00Z', '2026-10-08T18:00:00Z')).toBe(
      '10:00 PM – Oct 9, 1:00 AM',
    );
  });

  test('a day and clock time become the team-zone instant the server stores', () => {
    expect(zonedInstant('2026-10-07', '2:00 PM', JAKARTA)).toBe('2026-10-07T07:00:00.000Z');
    expect(zonedInstant('2026-10-08', '6:30 AM', JAKARTA)).toBe('2026-10-07T23:30:00.000Z');
    // Across a daylight-saving change the offset of that very moment is used.
    expect(zonedInstant('2026-03-29', '9:00 AM', 'Europe/Berlin')).toBe('2026-03-29T07:00:00.000Z');
    expect(() => zonedInstant('soon', '9:00 AM', JAKARTA)).toThrow('Not an ISO date: soon');
  });

  test('reminders in words', () => {
    expect(reminderLabel([1440, 30])).toBe('1 day & 30 min before');
    expect(reminderLabel([30, 120, 2880])).toBe('2 days, 2 hours & 30 min before');
    expect(reminderLabel([0])).toBe('At the start');
    expect(reminderLabel([60, 0])).toBe('1 hour before, and at the start');
    expect(reminderLabel([])).toBe('No reminder');
  });
});

describe('event view', () => {
  test('status: Canceled, Done once its last day is past, Today while it touches today, else Upcoming', () => {
    expect(eventStatusOf(reviewItem())).toBe('Today');
    expect(eventStatusOf(syncItem())).toBe('Upcoming');
    expect(eventStatusOf(reviewItem(), '2026-10-08')).toBe('Done');
    expect(eventStatusOf(reviewItem({ canceledAt: '2026-10-06T00:00:00Z' }))).toBe('Canceled');
  });

  test('where: the place, Online, or that there is none', () => {
    expect(whereOf(reviewItem())).toBe('In person · Meeting Room 2');
    expect(whereOf(syncItem())).toBe('Online');
    expect(whereOf(reviewItem({ locationText: ' ' }))).toBe('In person');
    expect(whereOf(reviewItem({ locationType: null, locationText: 'Café' }))).toBe('Café');
    expect(whereOf(reviewItem({ locationType: null, locationText: null }))).toBe('No location');
  });

  test('a row carries the day, start, range, type and the minutes state', () => {
    expect(rowOf(reviewItem({ noteStatus: 'draft' }))).toEqual({
      id: 'e-review',
      href: '/events/e-review',
      title: 'Onboarding design review',
      date: '2026-10-07',
      day: 'Wed, Oct 7',
      start: '2:00 PM',
      range: '2:00–3:00 PM',
      where: 'In person · Meeting Room 2',
      type: 'Review',
      status: 'Today',
      note: 'Minutes draft',
    });
  });

  test('the detail puts the creator first, splits the agenda and names who canceled', () => {
    const d = eventDetailOf(
      reviewDetail({
        canceledAt: '2026-10-06T00:00:00Z',
        cancelReason: 'Room taken',
        canceledBy: RINA,
        note: { body: 'Ship it', status: 'confirmed', updatedAt: '2026-10-07T09:00:00Z' },
      }),
    );
    expect(d.guests.map((g) => [g.name, g.creator])).toEqual([
      ['Nico Arya', true],
      ['Rina Putri', false],
      ['Dodi Saputra', false],
    ]);
    expect(d).toMatchObject({
      status: 'Canceled',
      canceled: { by: 'Rina Putri', reason: 'Room taken' },
      time: 'Wed, Oct 7 · 2:00–3:00 PM',
      agenda: ['Walk through the flow', 'Decide the copy'],
      reminder: '1 day & 30 min before',
      minutes: { status: 'Minutes confirmed', body: 'Ship it' },
      footer: 'Created by Nico Arya · Updated Oct 6',
      link: null,
    });
    expect(eventDetailOf(reviewDetail({ ...syncItem(), participants: [] })).link).toBe(
      'https://meet.example.com/abc',
    );
  });
});
