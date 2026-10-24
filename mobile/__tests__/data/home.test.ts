import { resetArchive } from '../../src/data/archive.store';
import { daysBetween, daysToSunday, monthDay, weekdayMonthDay } from '../../src/data/dates';
import { addEvent, archiveEvent, cancelEvent, resetEvents } from '../../src/data/events.store';
import { getHome } from '../../src/data/home';
import { markFocusDone } from '../../src/data/home.actions';
import type { HomeData, StatKey } from '../../src/data/home.types';
import { getTasksState, taskInfo } from '../../src/data/tasks.state';
import { archiveTask, moveTask, resetTasks } from '../../src/data/tasks.store';

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

// Home reads the live stores: what Tasks and Events change shows on the next getHome (and re-renders the screen).
describe('getHome on the live stores', () => {
  afterEach(() => {
    resetTasks();
    resetEvents();
    resetArchive();
  });
  const upcoming = (h: HomeData) => stat(h, 'upcoming')?.sub;

  test("Done from My Focus moves the task through tasks.store and logs it as Nico's", () => {
    markFocusDone('pm', 14);
    const h = getHome('pm');
    expect(groupNos(h).today).toEqual([]);
    expect(stat(h, 'assigned')?.count).toBe(2);
    expect(stat(h, 'completed')?.count).toBe(1);
    expect(h.focus.openCount).toBe(2);
    expect(getTasksState().tasks.find((t) => t.no === 14)?.status).toBe('Done');
    expect(taskInfo(getTasksState(), 14).history.at(-1)).toMatchObject({
      text: 'Nico marked this task done',
    });
  });

  test('Done is refused where My Focus does not offer it', () => {
    expect(() => markFocusDone('pm', 12)).toThrow(
      'Cannot mark task #12 done from Home: My Focus does not offer it to Nico',
    );
    expect(() => markFocusDone('pm', 17)).toThrow('Cannot mark task #17 done from Home');
    expect(() => markFocusDone('member', 14)).toThrow('Cannot mark task #14 done from Home');
  });

  test('a task canceled or moved to Archive in Tasks leaves My Focus and Upcoming', () => {
    moveTask(9, 'Canceled');
    archiveTask(14, 'Nico');
    const h = getHome('pm');
    expect(groupNos(h)).toEqual({ overdue: [12], today: [], thisWeek: [] });
    expect(stat(h, 'assigned')?.count).toBe(1);
    expect(upcoming(h)).toEqual({ kind: 'items', n: 5 });
  });

  test('a canceled or archived event leaves Agenda and Upcoming; the next one shows with its link', () => {
    cancelEvent('review', 'Moved to next week', 'Nico');
    let h = getHome('pm');
    expect(h.agenda.next?.id).not.toBe('review');
    expect(upcoming(h)).toEqual({ kind: 'items', n: 6 });
    const next = h.agenda.next?.id ?? '';
    expect(h.agenda.next?.href).toBe(`/events/${next}`);
    archiveEvent(next, 'Nico');
    h = getHome('pm');
    expect(h.agenda.next?.id).not.toBe(next);
    expect(upcoming(h)).toEqual({ kind: 'items', n: 5 });
  });

  test('a new event I attend this month counts as upcoming', () => {
    addEvent(
      {
        title: 'Sprint demo',
        date: '2026-10-20',
        start: '10:00 AM',
        end: '11:00 AM',
        mode: 'Online',
        place: 'Meet',
        attendees: [],
        type: 'Meeting',
        project: '',
        agenda: [],
        repeat: '',
      },
      'Nico',
    );
    expect(upcoming(getHome('pm'))).toEqual({ kind: 'items', n: 8 });
    expect(upcoming(getHome('member'))).toEqual({ kind: 'items', n: 5 });
  });
});
