import { describe, expect, it } from 'bun:test';
import { METRICS } from '../../server/metrics/config';
import { isoDateIn } from '../../server/metrics/dates';
import {
  ACTIVE_STATUSES,
  ageDays,
  isActive,
  isOverdue,
  isStale,
  taskLabels,
} from '../../server/metrics/task.metrics';
import type { TaskMetricsRow } from '../../server/metrics/types';

const NOW = new Date('2026-10-07T05:00:00Z');
const TODAY = '2026-10-07';
const HOUR = 3_600_000;

/** Builds a task row with sensible defaults; override only what a case is about. */
function task(over: Partial<TaskMetricsRow> = {}): TaskMetricsRow {
  return {
    status: 'todo',
    deletedAt: null,
    dueDate: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    completedAt: null,
    canceledAt: null,
    lastActivityAt: NOW,
    reopenCount: 0,
    ...over,
  };
}

describe('ACTIVE_STATUSES / isActive', () => {
  it('lists exactly the three open statuses', () => {
    expect([...ACTIVE_STATUSES]).toEqual(['todo', 'in_progress', 'in_review']);
  });

  it.each([
    ['todo', true],
    ['in_progress', true],
    ['in_review', true],
    ['done', false],
    ['canceled', false],
  ] as const)('status %s -> %p', (status, expected) => {
    expect(isActive(task({ status }))).toBe(expected);
  });

  it('a trashed task is never active', () => {
    expect(isActive(task({ deletedAt: NOW }))).toBe(false);
  });
});

describe('isOverdue (R03 F13)', () => {
  it('covers the five cases', () => {
    expect(isOverdue(task({ dueDate: '2026-10-06' }), TODAY)).toBe(true); // due yesterday
    expect(isOverdue(task({ dueDate: '2026-10-07' }), TODAY)).toBe(false); // due today is not late yet
    expect(isOverdue(task({ status: 'done', dueDate: '2026-09-01' }), TODAY)).toBe(false);
    expect(isOverdue(task({ dueDate: null }), TODAY)).toBe(false);
    expect(isOverdue(task({ dueDate: '2026-10-01', deletedAt: NOW }), TODAY)).toBe(false);
  });

  it('canceled tasks are not overdue either', () => {
    expect(isOverdue(task({ status: 'canceled', dueDate: '2026-09-01' }), TODAY)).toBe(false);
  });

  it('R03 F16: 17:30 UTC counts as the next Jakarta day, so a task due that UTC day is late', () => {
    const today = isoDateIn(new Date('2026-10-06T17:30:00Z'), METRICS.TIME_ZONE);
    expect(today).toBe('2026-10-07');
    expect(isOverdue(task({ dueDate: '2026-10-06' }), today)).toBe(true);
  });
});

describe('isStale (R03 F14)', () => {
  const stale = (over: Partial<TaskMetricsRow>) => isStale(task(over), NOW);

  it('exactly 72 hours is not stale, one minute more is', () => {
    expect(
      stale({ status: 'in_progress', lastActivityAt: new Date(NOW.getTime() - 72 * HOUR) }),
    ).toBe(false);
    expect(
      stale({
        status: 'in_progress',
        lastActivityAt: new Date(NOW.getTime() - 72 * HOUR - 60_000),
      }),
    ).toBe(true);
  });

  it('only in-progress tasks go stale, however old', () => {
    const old = new Date(NOW.getTime() - 240 * HOUR);
    expect(stale({ status: 'todo', lastActivityAt: old })).toBe(false);
    expect(stale({ status: 'in_review', lastActivityAt: old })).toBe(false);
    expect(stale({ status: 'done', lastActivityAt: old })).toBe(false);
  });

  it('a trashed task is not stale', () => {
    const old = new Date(NOW.getTime() - 240 * HOUR);
    expect(stale({ status: 'in_progress', lastActivityAt: old, deletedAt: NOW })).toBe(false);
  });

  it('honours an overridden threshold', () => {
    const t = task({ status: 'in_progress', lastActivityAt: new Date(NOW.getTime() - 30 * HOUR) });
    expect(isStale(t, NOW, { TASK_STALE_DAYS: 1 })).toBe(true);
    expect(isStale(t, NOW, { TASK_STALE_DAYS: 2 })).toBe(false);
  });
});

describe('ageDays (R03 F15)', () => {
  const created = new Date('2026-09-30T17:30:00Z'); // 1 Oct 00:30 in Jakarta

  it('open task: 6 calendar days in Jakarta (a UTC-date diff would say 7)', () => {
    expect(ageDays(task({ createdAt: created }), NOW)).toBe(6);
    expect(ageDays(task({ createdAt: created }), NOW, 'UTC')).toBe(7);
  });

  it('done task stops counting at completion: 3 days', () => {
    const done = task({
      status: 'done',
      createdAt: created,
      completedAt: new Date('2026-10-04T05:00:00Z'),
    });
    expect(ageDays(done, NOW)).toBe(3);
  });

  it('canceled task stops counting at cancellation', () => {
    const c = task({
      status: 'canceled',
      createdAt: created,
      canceledAt: new Date('2026-10-02T05:00:00Z'),
    });
    expect(ageDays(c, NOW)).toBe(1);
  });

  it('is 0 on the creation day and never negative', () => {
    expect(ageDays(task({ createdAt: NOW }), NOW)).toBe(0);
    expect(ageDays(task({ createdAt: new Date('2026-10-09T00:00:00Z') }), NOW)).toBe(0);
  });
});

describe('taskLabels (R03 F20)', () => {
  const ctx = { today: TODAY, now: NOW, blocked: false, awaitingMe: false };

  it('lists overdue, awaiting my review and blocked in that order; overdue is primary', () => {
    const t = task({ status: 'in_review', dueDate: '2026-10-01' });
    const r = taskLabels(t, { ...ctx, blocked: true, awaitingMe: true });
    expect(r.all).toEqual(['overdue', 'awaiting_my_review', 'blocked']);
    expect(r.primary).toBe('overdue');
  });

  it('orders the full set: overdue > awaiting > blocked > stale > reopened', () => {
    // in_review and in_progress are mutually exclusive, so stale is checked against its own row below.
    const t = task({
      status: 'in_progress',
      dueDate: '2026-10-01',
      reopenCount: 2,
      lastActivityAt: new Date(NOW.getTime() - 100 * HOUR),
    });
    const r = taskLabels(t, { ...ctx, blocked: true, awaitingMe: true });
    expect(r.all).toEqual(['overdue', 'blocked', 'stale', 'reopened']);
  });

  it('primary falls through to the next label when the earlier ones do not apply', () => {
    expect(taskLabels(task({ status: 'in_review' }), { ...ctx, awaitingMe: true }).primary).toBe(
      'awaiting_my_review',
    );
    expect(taskLabels(task(), { ...ctx, blocked: true }).primary).toBe('blocked');
    const stale = task({
      status: 'in_progress',
      lastActivityAt: new Date(NOW.getTime() - 100 * HOUR),
    });
    expect(taskLabels(stale, ctx).primary).toBe('stale');
    expect(taskLabels(task({ reopenCount: 1 }), ctx).primary).toBe('reopened');
  });

  it('no labels -> empty list and null primary', () => {
    expect(taskLabels(task(), ctx)).toEqual({ all: [], primary: null });
  });

  it('caller flags do not label tasks that cannot carry them', () => {
    const flags = { ...ctx, blocked: true, awaitingMe: true };
    expect(taskLabels(task({ status: 'done' }), flags).all).toEqual([]);
    expect(taskLabels(task({ status: 'todo' }), flags).all).toEqual(['blocked']); // not in review
    expect(taskLabels(task({ deletedAt: NOW, reopenCount: 3 }), flags).all).toEqual([]);
  });

  it('a done task keeps its reopened mark', () => {
    expect(taskLabels(task({ status: 'done', reopenCount: 1 }), ctx).all).toEqual(['reopened']);
  });
});
