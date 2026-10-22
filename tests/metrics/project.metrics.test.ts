import { describe, expect, test } from 'bun:test';
import { elapsed, milestoneState, progress } from '../../server/metrics/project.metrics';
import type { TaskMetricsRow } from '../../server/metrics/types';

type Row = Pick<TaskMetricsRow, 'status' | 'deletedAt'>;

const TRASHED = new Date('2026-10-01T00:00:00Z');

/** `n` rows of one status, optionally in the trash. */
function rows(n: number, status: Row['status'], trashed = false): Row[] {
  return Array.from({ length: n }, () => ({ status, deletedAt: trashed ? TRASHED : null }));
}

describe('progress', () => {
  test('R03 F01: 3 done of 6 counted (in_review, canceled and trashed handled) -> 50', () => {
    const tasks = [
      ...rows(3, 'done'),
      ...rows(1, 'in_review'),
      ...rows(2, 'todo'),
      ...rows(1, 'canceled'),
      ...rows(1, 'done', true),
    ];
    expect(progress(tasks)).toEqual({ done: 3, total: 6, percent: 50 });
  });

  test.each([
    ['no tasks at all', []],
    ['only canceled tasks', rows(3, 'canceled')],
    ['only trashed tasks', rows(2, 'done', true)],
  ] as [string, Row[]][])('R03 F02: %s -> percent null, never 0', (_label, tasks) => {
    const r = progress(tasks);
    expect(r.percent).toBeNull();
    expect(r.total).toBe(0);
  });

  test.each([
    [199, 200, 99],
    [200, 200, 100],
  ])('R03 F03: %i of %i -> %i (100 only when every counted task is done)', (done, total, pct) => {
    const tasks = [...rows(done, 'done'), ...rows(total - done, 'todo')];
    expect(progress(tasks)).toEqual({ done, total, percent: pct });
  });

  test('replaces F04 (phase version is deferred): 2 of 3 done rounds to 67, not floor 66', () => {
    expect(progress([...rows(2, 'done'), ...rows(1, 'todo')]).percent).toBe(67);
  });

  test('golden Atlas: 1 done of 6 non-canceled -> 17 (rounded, not floor 16)', () => {
    const atlas = [
      ...rows(1, 'done'),
      ...rows(1, 'in_progress'),
      ...rows(3, 'todo'),
      ...rows(1, 'in_review'),
    ];
    expect(progress([...atlas, ...rows(2, 'canceled')])).toEqual({
      done: 1,
      total: 6,
      percent: 17,
    });
  });

  test('a single done task is 100, a single open task is 0', () => {
    expect(progress(rows(1, 'done')).percent).toBe(100);
    expect(progress(rows(1, 'todo')).percent).toBe(0);
  });

  test('in_review does not count as done', () => {
    expect(progress(rows(2, 'in_review')).percent).toBe(0);
  });

  test('does not mutate or depend on the order of the input', () => {
    const tasks = [...rows(1, 'todo'), ...rows(1, 'done')];
    const copy = [...tasks];
    expect(progress(tasks)).toEqual(progress([...tasks].reverse()));
    expect(tasks).toEqual(copy);
  });
});

describe('elapsed', () => {
  test('R03 F05: start 10-01, due 10-31, today 10-07 -> 20, not overrun', () => {
    expect(elapsed('2026-10-01', '2026-10-31', '2026-10-07')).toEqual({
      percent: 20,
      overrun: false,
    });
  });

  test.each([
    ['after the due date', '2026-11-05', { percent: 100, overrun: true }],
    ['before the start', '2026-09-28', { percent: 0, overrun: false }],
    ['on the due date', '2026-10-31', { percent: 100, overrun: false }],
  ])('R03 F06: today %s clamps to 0-100', (_label, today, expected) => {
    expect(elapsed('2026-10-01', '2026-10-31', today)).toEqual(expected);
  });

  test.each([
    ['start equals due', '2026-10-01', '2026-10-01'],
    ['due before start', '2026-10-10', '2026-10-01'],
    ['no start', null, '2026-10-31'],
    ['no due date', '2026-10-01', null],
    ['no dates', null, null],
  ])('R03 F06: %s -> null', (_label, start, due) => {
    expect(elapsed(start, due, '2026-10-07')).toBeNull();
  });

  test('golden Atlas: 36 of 60 days -> 60', () => {
    expect(elapsed('2026-09-01', '2026-10-31', '2026-10-07')).toEqual({
      percent: 60,
      overrun: false,
    });
  });

  test('counts calendar days across a month boundary', () => {
    // 28 Feb -> 3 Mar 2028 (leap year) is 4 days; halfway is day 2.
    expect(elapsed('2028-02-28', '2028-03-03', '2028-03-01')).toEqual({
      percent: 50,
      overrun: false,
    });
  });
});

describe('milestoneState', () => {
  test.each([
    ['R03 F12: due 10-06, not reached', '2026-10-06', null, 'overdue'],
    ['R03 F12: due today, not reached', '2026-10-07', null, 'waiting'],
    ['due later', '2026-10-20', null, 'waiting'],
    ['reached, even when past due', '2026-10-01', new Date('2026-10-05T03:00:00Z'), 'reached'],
  ] as const)('%s -> %s', (_label, dueDate, reachedAt, expected) => {
    expect(milestoneState({ dueDate, reachedAt }, '2026-10-07')).toBe(expected);
  });
});
