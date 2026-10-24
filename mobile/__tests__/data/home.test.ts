import { daysBetween, daysToSunday, monthDay, weekdayMonthDay } from '../../src/data/dates';
import { getHome } from '../../src/data/home';
import type { HomeData, StatKey } from '../../src/data/home.types';

// Expected values are the prototype's Home on its sample "today" (Wed, Oct 7, 2026), per role.

const stat = (h: HomeData, key: StatKey) => h.stats.find((s) => s.key === key);
const groupNos = (h: HomeData) =>
  Object.fromEntries(h.focus.groups.map((g) => [g.key, g.tasks.map((t) => t.no)]));

describe('dates', () => {
  test('labels and week maths in UTC', () => {
    expect(monthDay('2026-10-07')).toBe('Oct 7');
    expect(weekdayMonthDay('2026-10-01')).toBe('Thu, Oct 1');
    expect(daysBetween('2026-10-07', '2026-10-05')).toBe(-2);
    expect(daysToSunday('2026-10-07')).toBe(4);
    expect(() => monthDay('Oct 7')).toThrow('Not an ISO date (YYYY-MM-DD): Oct 7');
  });
});

describe('getHome · Project Manager (Nico)', () => {
  const h = getHome('pm');

  test('stat chips', () => {
    expect(h.stats.map((s) => s.key)).toEqual([
      'assigned',
      'inProgress',
      'completed',
      'upcoming',
      'inbox',
    ]);
    expect(stat(h, 'assigned')).toMatchObject({
      count: 3,
      sub: { kind: 'overdue', n: 1 },
      alert: true,
      target: 'tasks.all',
    });
    expect(stat(h, 'inProgress')).toMatchObject({
      count: 1,
      sub: { kind: 'overdue', n: 1 },
      alert: true,
    });
    expect(stat(h, 'completed')).toMatchObject({
      count: 0,
      sub: { kind: 'thisWeek' },
      alert: false,
    });
    expect(stat(h, 'upcoming')).toMatchObject({ count: null, sub: { kind: 'items', n: 7 } });
    expect(stat(h, 'inbox')).toMatchObject({ count: null, sub: { kind: 'toRespond', n: 3 } });
  });

  test('My Focus: overdue #12 (has a reviewer), today #14, this week #9, review #17', () => {
    expect(groupNos(h)).toEqual({ overdue: [12], today: [14], thisWeek: [9] });
    expect(h.focus.groups[0].tasks[0]).toMatchObject({
      no: 12,
      canMarkDone: false,
      status: 'In progress',
    });
    expect(h.focus.groups[1].tasks[0].canMarkDone).toBe(true);
    expect(h.focus.review.map((t) => t.no)).toEqual([17]);
    expect(h.focus).toMatchObject({ openCount: 3, pendingUsers: null, empty: false });
  });

  test('agenda, lists and header', () => {
    expect(h.greeting).toBe('Good morning');
    expect(h.me.name).toBe('Nico');
    expect(h.agenda.next).toMatchObject({
      id: 'review',
      time: '2:00',
      date: '2026-10-07',
      place: 'Meeting Room 2',
    });
    expect(h.agenda.projects.map((p) => p.name)).toEqual([
      'Atlas Project',
      'PT Sinar Client Portal',
      'Internal Tools',
      'Attendance App',
    ]);
    expect([h.ask.questions.length, h.done.length, h.activity.length]).toEqual([3, 4, 3]);
  });

  test('a task marked done leaves My Focus and counts as completed today', () => {
    const after = getHome('pm', { completed: [14] });
    expect(groupNos(after).today).toEqual([]);
    expect(stat(after, 'assigned')?.count).toBe(2);
    expect(stat(after, 'completed')?.count).toBe(1);
    expect(after.focus.openCount).toBe(2);
  });
});

describe('getHome · Member (Dodi)', () => {
  const h = getHome('member');

  test('stat chips', () => {
    expect(stat(h, 'assigned')).toMatchObject({ count: 2, sub: { kind: 'onTrack' }, alert: false });
    expect(stat(h, 'inProgress')).toMatchObject({ count: 0, sub: { kind: 'noneStarted' } });
    expect(stat(h, 'completed')?.count).toBe(0);
    expect(stat(h, 'upcoming')?.sub).toEqual({ kind: 'items', n: 5 });
    expect(stat(h, 'inbox')?.sub).toEqual({ kind: 'toRespond', n: 3 });
  });

  test('My Focus, agenda and list lengths', () => {
    expect(groupNos(h)).toEqual({ overdue: [], today: [], thisWeek: [17] });
    expect(h.focus.groups[2].tasks[0]).toMatchObject({ status: 'In review', canMarkDone: false });
    expect(h.focus.review).toEqual([]);
    expect(h.focus.openCount).toBe(2);
    expect(h.agenda.next?.id).toBe('review');
    expect(h.agenda.projects.map((p) => p.id)).toEqual(['atlas', 'migration', 'tools']);
    expect([h.ask.questions.length, h.done.length, h.activity.length]).toEqual([2, 2, 1]);
  });
});

describe('getHome · Admin (Ayu)', () => {
  const h = getHome('admin');

  test('workspace chips: Overdue shows the prototype value 3', () => {
    expect(h.stats.map((s) => [s.key, s.count])).toEqual([
      ['active', 3],
      ['overdue', 3],
      ['awaiting', 2],
      ['upcoming', null],
      ['inbox', null],
    ]);
    expect(stat(h, 'awaiting')).toMatchObject({
      sub: { kind: 'unit', unit: 'users' },
      target: 'users.approve',
    });
    expect(stat(h, 'upcoming')?.sub).toEqual({ kind: 'items', n: 1 });
    expect(stat(h, 'inbox')?.sub).toEqual({ kind: 'toRespond', n: 3 });
  });

  test('approvals first, no own tasks, every open project', () => {
    expect(h.focus).toMatchObject({ pendingUsers: 2, openCount: 0, empty: true, review: [] });
    expect(h.agenda.next?.id).toBe('party');
    expect(h.agenda.projects).toHaveLength(5);
  });
});
