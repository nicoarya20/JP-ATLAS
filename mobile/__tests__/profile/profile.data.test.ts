import { eventsStore } from '../../src/data/events.store';
import { getMyCalendar, getProfile } from '../../src/data/profile';
import {
  clock,
  dayLabel,
  eventsFor,
  FIRST_MIN,
  HOUR_PX,
  hourLabel,
  initialScroll,
  NOW_MIN,
  occursOn,
  weekOf,
} from '../../src/data/profile.calendar.dates';
import { pageOf } from '../../src/data/profile.calendar.swipe';
import { getProfileState, NOTE_MAX, resetProfile, setProfile } from '../../src/data/profile.store';
import { viewerNamed } from '../helpers/session-fixtures';

const events = () => eventsStore.get().list;

describe('profile.calendar.dates', () => {
  test('the week starts on Sunday, as in iOS Calendar', () => {
    expect(weekOf('2026-10-07')).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
    expect(weekOf('2026-10-04')[0]).toBe('2026-10-04');
  });

  test('labels: day, hour and clock', () => {
    expect(dayLabel('2026-10-07')).toBe('Wednesday, Oct 7, 2026');
    expect([0, 9, 12, 15].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '3 PM']);
    expect(clock(NOW_MIN)).toBe('9:41');
  });

  test('a weekly event repeats every 7 days, never before its first date', () => {
    const item = { e: events()[0], date: '2026-10-07', start: 0, end: 60, every: 7 };
    expect(occursOn(item, '2026-10-07')).toBe(true);
    expect(occursOn(item, '2026-10-14')).toBe(true);
    expect(occursOn(item, '2026-10-08')).toBe(false);
    expect(occursOn(item, '2026-09-30')).toBe(false);
    expect(occursOn({ ...item, every: 0 }, '2026-10-14')).toBe(false);
  });

  test('the grid opens an hour before now, the first event, or 8 AM', () => {
    const at = (min: number) => ((min - 60) / 60) * HOUR_PX;
    expect(initialScroll(true, [])).toBe(at(NOW_MIN));
    const first = eventsFor(events(), viewerNamed('Nico'))[0];
    expect(initialScroll(false, [first])).toBe(at(first.start));
    expect(initialScroll(false, [])).toBe(at(FIRST_MIN));
  });
});

describe('week strip paging (pageOf)', () => {
  const W = 360;
  test('a drag past a quarter of the width pages; left = next week', () => {
    expect(pageOf(-100, 0, W)).toBe(1);
    expect(pageOf(100, 0, W)).toBe(-1);
    expect(pageOf(-80, 0, W)).toBe(0);
  });

  test('a short flick pages, a flick against the drag does not', () => {
    expect(pageOf(-20, -600, W)).toBe(1);
    expect(pageOf(-10, -600, W)).toBe(0);
    expect(pageOf(-20, 600, W)).toBe(0);
  });

  test('a narrow strip still needs 40 px of travel', () => {
    expect(pageOf(-39, 0, 100)).toBe(0);
    expect(pageOf(-41, 0, 100)).toBe(1);
  });
});

describe('getMyCalendar', () => {
  test('today: month, picked day, my events in order with their tones', () => {
    const d = getMyCalendar('pm', '2026-10-07', events());
    expect(d.month).toBe('October 2026');
    expect(d.dayLabel).toBe('Wednesday, Oct 7, 2026');
    expect(d.today).toBe(true);
    expect(d.count).toBe('2 events');
    expect(d.blocks.map((b) => [b.title, b.tone])).toEqual([
      ['Atlas daily stand-up', 'blue'],
      ['Onboarding design review', 'purple'],
    ]);
    const picked = d.week.filter((x) => x.picked);
    expect(picked).toHaveLength(1);
    expect(picked[0].label).toBe('Wednesday, Oct 7, 2026, today');
    expect(d.week.find((x) => x.iso === '2026-10-10')?.weekend).toBe(true);
  });

  test('a day without my events', () => {
    const d = getMyCalendar('pm', '2026-10-05', events());
    expect(d.count).toBe('No events');
    expect(d.blocks).toEqual([]);
    expect(d.today).toBe(false);
  });
});

describe('profile', () => {
  test('the role line marks an Admin', () => {
    expect(getProfile('admin').line).toBe('Operations Lead · Operations · Admin');
    expect(getProfile('pm').line).not.toContain('Admin');
  });

  test('the note is trimmed and cut at NOTE_MAX; reset restores the sample', () => {
    resetProfile();
    const before = getProfileState();
    setProfile({ note: `  ${'x'.repeat(NOTE_MAX + 5)}  ` });
    expect(getProfileState().note).toHaveLength(NOTE_MAX);
    setProfile({ online: false, muted: true });
    expect(getProfileState()).toMatchObject({ online: false, muted: true });
    resetProfile();
    expect(getProfileState()).toEqual(before);
  });
});
