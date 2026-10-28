// My tasks' schedule groups worked out with the server's boundaries (tasks.list.ts scheduleGroupOf,
// `server/metrics/schedule.ts`), and what the board says after a move on the server (tasks.columns.ts).
import { ApiError } from '@/api/errors';
import { countedTasks, serverMoveNotice } from '@/data/tasks.columns';
import { scheduleGroupOf } from '@/data/tasks.list';

describe('scheduleGroupOf', () => {
  test('on a Wednesday (the test clock, Oct 7): This week runs to Sunday', () => {
    expect(scheduleGroupOf('2026-10-06')).toBe('overdue');
    expect(scheduleGroupOf('2026-10-07')).toBe('today');
    expect(scheduleGroupOf('2026-10-08')).toBe('tomorrow');
    expect(scheduleGroupOf('2026-10-09')).toBe('week');
    expect(scheduleGroupOf('2026-10-11')).toBe('week');
    expect(scheduleGroupOf('2026-10-12')).toBe('later');
    expect(scheduleGroupOf(null)).toBe('none');
  });

  test('on a Saturday there is no This week: Sunday is tomorrow, Monday is later', () => {
    expect(scheduleGroupOf('2026-10-11', '2026-10-10')).toBe('tomorrow');
    expect(scheduleGroupOf('2026-10-12', '2026-10-10')).toBe('later');
    expect(scheduleGroupOf('2026-10-12', '2026-10-11')).toBe('tomorrow');
  });
});

describe('serverMoveNotice', () => {
  const refused = (message: string) => new ApiError({ message, code: 'FORBIDDEN', status: 403 });

  test('what moved, counted; nothing at all to say when every card was skipped', () => {
    expect(serverMoveNotice(false, 'Done', { moved: 1, failed: [] })).toBe('Moved to Done');
    expect(serverMoveNotice(true, 'Done', { moved: 2, failed: [] })).toBe('Moved 2 tasks to Done');
    expect(serverMoveNotice(true, 'Done', { moved: 0, failed: [] })).toBeNull();
  });

  test("a single refusal in the server's words; several say how many, with the first reason", () => {
    expect(
      serverMoveNotice(false, 'Done', { moved: 0, failed: [refused('Tugas terkunci.')] }),
    ).toBe('Tugas terkunci.');
    expect(
      serverMoveNotice(true, 'Done', {
        moved: 1,
        failed: [refused('Tugas terkunci.'), refused('Lainnya.')],
      }),
    ).toBe('Moved 1 task to Done. 2 tasks could not be moved: Tugas terkunci.');
  });

  test('a heading count reads "1 task", "3 tasks", "25+ tasks"', () => {
    expect(['1', '3', '25+'].map(countedTasks)).toEqual(['1 task', '3 tasks', '25+ tasks']);
  });
});
