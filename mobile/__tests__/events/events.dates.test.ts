import {
  addDays,
  clockMinutes,
  col,
  dayLabel,
  eventsOn,
  groupLabel,
  monthOf,
  monthTitle,
  occurrenceStatus,
  occursOn,
  startMinutes,
  stepMonth,
  weekOf,
  weekTitle,
} from '../../src/data/events.dates';
import type { EventItem } from '../../src/data/events.shared';
import { eventsStore, findEvent, resetEvents } from '../../src/data/events.store';

// Expected values are the prototype's calendar on its sample "today", Wed, Oct 7, 2026.

const event = (id: string): EventItem => {
  const e = findEvent(id);
  if (!e) throw new Error(`test-only: no sample event ${id}`);
  return e;
};
const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;

afterEach(resetEvents);

describe('events dates', () => {
  test('October 2026 has 31 dates and starts on a Thursday column', () => {
    const october = monthOf('2026-10-07');
    expect(october).toHaveLength(31);
    expect(october[0]).toBe('2026-10-01');
    expect(october[30]).toBe('2026-10-31');
    expect(col('2026-10-01')).toBe(3);
    expect(monthOf('2026-11-01')).toHaveLength(30);
    expect(monthOf('2028-02-10')).toHaveLength(29);
  });

  test('a week runs Monday to Sunday, across months too', () => {
    expect(weekOf('2026-10-07')).toEqual([5, 6, 7, 8, 9, 10, 11].map(day));
    expect(weekTitle(weekOf('2026-10-07'))).toBe('Oct 5 – 11');
    const crossing = weekOf('2026-10-28');
    expect(crossing[0]).toBe('2026-10-26');
    expect(crossing[6]).toBe('2026-11-01');
    expect(weekTitle(crossing)).toBe('Oct 26 – Nov 1');
    expect(weekOf('2026-10-11')[0]).toBe('2026-10-05');
  });

  test('month arrows pick the 1st, or today back in today’s month', () => {
    expect(stepMonth('2026-10-07', 1)).toBe('2026-11-01');
    expect(stepMonth('2026-11-01', -1)).toBe('2026-10-07');
    expect(stepMonth('2026-01-15', -1)).toBe('2025-12-01');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });

  test('titles and labels come from fixed English names', () => {
    expect(monthTitle('2026-10-07')).toBe('October 2026');
    expect(monthTitle('2026-11-01')).toBe('November 2026');
    expect(dayLabel('2026-10-07')).toBe('Today');
    expect(dayLabel('2026-10-08')).toBe('Thu 8');
    expect(dayLabel('2026-10-13')).toBe('Tue 13');
  });

  test('groups dates as Earlier, Today, Tomorrow, This week (to Sunday) and Later', () => {
    expect([1, 7, 8, 11, 12].map((n) => groupLabel(day(n)))).toEqual([
      'Earlier · Thu, Oct 1',
      'Today · Wed, Oct 7',
      'Tomorrow · Thu, Oct 8',
      'This week',
      'Later',
    ]);
  });

  test('clock times as minutes since midnight', () => {
    expect(clockMinutes('2:00 PM')).toBe(840);
    expect(clockMinutes('12:00 PM')).toBe(720);
    expect(clockMinutes('12:15 AM')).toBe(15);
    expect(startMinutes(event('daily'))).toBe(540);
    expect(startMinutes(event('review'))).toBe(840);
    expect(() => clockMinutes('14:00')).toThrow('Not a clock time (h:mm AM/PM): 14:00');
  });

  test('a recurring event falls every 2 weeks after its first date, into November', () => {
    const sprint = event('sprint');
    expect([9, 23].map((n) => occursOn(sprint, day(n)))).toEqual([true, true]);
    expect(occursOn(sprint, '2026-11-06')).toBe(true);
    expect([2, 16, 30].map((n) => occursOn(sprint, day(n)))).toEqual([false, false, false]);
    expect(occursOn(event('sinar'), day(15))).toBe(false);
    expect(eventsOn(eventsStore.get().list, day(7)).map((e) => e.id)).toEqual(['review', 'daily']);
  });

  test('a series canceled as a whole stops repeating; one canceled occurrence does not', () => {
    const sprint = event('sprint');
    const all: EventItem = { ...sprint, canceled: { reason: 'Holiday', by: 'Nico', once: false } };
    expect(occursOn(all, day(9))).toBe(true);
    expect(occursOn(all, day(23))).toBe(false);
    expect(occurrenceStatus(all, day(9))).toBe('Canceled');
    const once: EventItem = { ...sprint, canceled: { reason: 'Holiday', by: 'Nico', once: true } };
    expect(occursOn(once, day(23))).toBe(true);
    expect(occurrenceStatus(once, day(9))).toBe('Canceled');
    expect(occurrenceStatus(once, day(23))).toBe('Upcoming');
  });
});
