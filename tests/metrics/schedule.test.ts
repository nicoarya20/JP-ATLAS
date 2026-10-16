import { describe, expect, it } from 'bun:test';
import { isoDateIn } from '../../server/metrics/dates';
import {
  SCHEDULE_GROUPS,
  type ScheduleGroup,
  scheduleBounds,
  scheduleGroupOf,
} from '../../server/metrics/schedule';
import type { TaskStatus } from '../../server/pm/enums';

const TZ = 'Asia/Jakarta';
const open = (
  dueDate: string | null,
  status: TaskStatus = 'todo',
  deletedAt: Date | null = null,
) => ({
  status,
  deletedAt,
  dueDate,
});

// 2026-10-07 is a Wednesday; its Sunday is 2026-10-11.
const WED = '2026-10-07';

describe('scheduleGroupOf', () => {
  it.each<[string, string, string | null, TaskStatus, ScheduleGroup | null]>([
    ['day before today', WED, '2026-10-06', 'todo', 'overdue'],
    ['due today is not overdue', WED, '2026-10-07', 'in_progress', 'today'],
    ['due tomorrow', WED, '2026-10-08', 'todo', 'tomorrow'],
    ['day after tomorrow is this week', WED, '2026-10-09', 'in_review', 'week'],
    ['Sunday closes the week on a Wednesday', WED, '2026-10-11', 'todo', 'week'],
    ['next Monday is later', WED, '2026-10-12', 'todo', 'later'],
    ['no due date', WED, null, 'todo', 'none'],
    ['done tasks join no group', WED, '2026-10-01', 'done', null],
    ['canceled tasks join no group', WED, null, 'canceled', null],
    ['Saturday: Sunday is tomorrow', '2026-10-10', '2026-10-11', 'todo', 'tomorrow'],
    ['Saturday: the week group is empty', '2026-10-10', '2026-10-12', 'todo', 'later'],
    ['Sunday: today', '2026-10-11', '2026-10-11', 'todo', 'today'],
    ['Sunday: Monday is tomorrow', '2026-10-11', '2026-10-12', 'todo', 'tomorrow'],
    ['Sunday: Tuesday is already later', '2026-10-11', '2026-10-13', 'todo', 'later'],
    ['Monday: Sunday still belongs to this week', '2026-10-05', '2026-10-11', 'todo', 'week'],
    ['Monday: next Monday is later', '2026-10-05', '2026-10-12', 'todo', 'later'],
    ['month end: Sunday in the next month', '2026-10-30', '2026-11-01', 'todo', 'week'],
    ['month end: Monday after it', '2026-10-30', '2026-11-02', 'todo', 'later'],
    ['year end: tomorrow is 1 Jan', '2026-12-31', '2027-01-01', 'todo', 'tomorrow'],
    ['leap day is tomorrow on 28 Feb 2028', '2028-02-28', '2028-02-29', 'todo', 'tomorrow'],
  ])('%s', (_name, today, due, status, expected) => {
    expect(scheduleGroupOf(open(due, status), today)).toBe(expected);
  });

  it('keeps a trashed task out of every group', () => {
    expect(scheduleGroupOf(open('2026-10-06', 'todo', new Date()), WED)).toBeNull();
  });

  it.each<[string, string, ScheduleGroup]>([
    ['23:59 WIB is still the due day', '2026-10-07T16:59:00Z', 'today'],
    ['00:00 WIB the next day makes it overdue', '2026-10-07T17:00:00Z', 'overdue'],
    ['00:00 WIB of the due day is today', '2026-10-06T17:00:00Z', 'today'],
    ['23:59 WIB the evening before is tomorrow', '2026-10-06T16:59:00Z', 'tomorrow'],
  ])('%s', (_name, instant, expected) => {
    // The caller derives "today" from the instant in the team zone; UTC 17:00 is already the next WIB day.
    const today = isoDateIn(new Date(instant), TZ);
    expect(scheduleGroupOf(open('2026-10-07'), today)).toBe(expected);
  });

  it('rejects a malformed date', () => {
    expect(() => scheduleGroupOf(open('2026-10-07'), '7 Oct')).toThrow('Invalid ISO date');
  });
});

describe('scheduleBounds', () => {
  it.each([
    ['Wednesday', '2026-10-07', '2026-10-08', '2026-10-11'],
    ['Monday', '2026-10-05', '2026-10-06', '2026-10-11'],
    ['Saturday', '2026-10-10', '2026-10-11', '2026-10-11'],
    ['Sunday', '2026-10-11', '2026-10-12', '2026-10-12'],
  ])('%s', (_day, today, tomorrow, weekEnd) => {
    expect(scheduleBounds(today)).toEqual({ today, tomorrow, weekEnd });
  });

  it('lists the six groups in display order', () => {
    expect([...SCHEDULE_GROUPS]).toEqual(['overdue', 'today', 'tomorrow', 'week', 'later', 'none']);
  });
});
