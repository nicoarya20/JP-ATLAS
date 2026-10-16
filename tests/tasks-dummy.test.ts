/** Filtering, grouping and sorting of the dummy task list. */
import { describe, expect, it } from 'bun:test';
import { NO_FILTERS, TASKS } from '../app/components/tasks/tasks.dummy';
import { filterTasks, groupOf, groupTasks } from '../app/components/tasks/tasks.filter';
import { PROJECT_PRIORITIES, TASK_STATUSES } from '../server/pm/enums';

/** Value that must exist; fails the test with a clear message instead of using `!`. */
function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error('expected a value');
  return v;
}
const numbers = (rows: { number: number }[]) => rows.map((t) => t.number);

describe('tasks dummy data', () => {
  it('uses known statuses and priorities with unique numbers', () => {
    for (const t of TASKS) {
      expect(TASK_STATUSES).toContain(t.status);
      expect(PROJECT_PRIORITIES).toContain(t.priority);
    }
    expect(new Set(numbers(TASKS)).size).toBe(TASKS.length);
  });
});

describe('filterTasks', () => {
  it('"Tugas saya" hides other people tasks and finished ones by default', () => {
    expect(numbers(filterTasks(TASKS, NO_FILTERS))).not.toContain(12);
    expect(numbers(filterTasks(TASKS, NO_FILTERS))).not.toContain(8);
  });

  it('"Semua tugas" includes other assignees', () => {
    expect(numbers(filterTasks(TASKS, { ...NO_FILTERS, scope: 'all' }))).toContain(12);
  });

  it('finds a task by #number or tag and sorts by due date', () => {
    expect(numbers(filterTasks(TASKS, { ...NO_FILTERS, q: '#17' }))).toEqual([17]);
    expect(numbers(filterTasks(TASKS, { ...NO_FILTERS, q: 'api' }))).toEqual([14]);
    expect(numbers(filterTasks(TASKS, NO_FILTERS))[0]).toBe(14);
  });

  it('the "Selesai" chip shows only finished tasks', () => {
    expect(numbers(filterTasks(TASKS, { ...NO_FILTERS, status: 'done' }))).toEqual([8]);
  });

  it('sorts by priority, highest first', () => {
    const rows = filterTasks(TASKS, { ...NO_FILTERS, scope: 'all', sort: 'priority' });
    expect(rows[0]?.priority).toBe('high');
  });
});

describe('groupOf / groupTasks', () => {
  it('buckets by distance from the fixed dummy today (2026-10-16)', () => {
    const by = (n: number) => groupOf(must(TASKS.find((t) => t.number === n)));
    expect(by(14)).toBe('Hari ini');
    expect(by(17)).toBe('Besok');
    expect(by(16)).toBe('Minggu ini');
    expect(by(9)).toBe('Nanti');
    expect(by(12)).toBe('Terlambat');
    expect(by(8)).toBe('Selesai');
  });

  it('keeps group order and skips empty groups', () => {
    const groups = groupTasks(TASKS).map((g) => g.group);
    expect(groups).toEqual(['Terlambat', 'Hari ini', 'Besok', 'Minggu ini', 'Nanti', 'Selesai']);
    expect(groupTasks([])).toEqual([]);
  });
});
