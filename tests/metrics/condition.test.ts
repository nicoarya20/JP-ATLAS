import { describe, expect, test } from 'bun:test';
import {
  activeOverride,
  type ConditionInput,
  type ConditionMilestone,
  type ConditionOverride,
  type ConditionReason,
  type ConditionTask,
  computeCondition,
  formatConditionReason,
} from '../../server/metrics/condition';
import { METRICS } from '../../server/metrics/config';
import { elapsed, progress } from '../../server/metrics/project.metrics';
import { isActive, isOverdue } from '../../server/metrics/task.metrics';
import type { ProjectCondition } from '../../server/pm/enums';

const NOW = new Date('2026-10-07T05:00:00Z');
const TODAY = '2026-10-07';
const PAST = '2026-10-05';

/** Builds a task row; override only what a case is about. */
function task(over: Partial<ConditionTask> = {}): ConditionTask {
  return {
    status: 'in_progress',
    deletedAt: null,
    dueDate: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    completedAt: null,
    canceledAt: null,
    lastActivityAt: NOW,
    reopenCount: 0,
    priority: 'medium',
    ...over,
  };
}

/** `n` low-priority tasks, `late` of them overdue. */
function lowTasks(n: number, late: number): ConditionTask[] {
  return Array.from({ length: n }, (_, k) =>
    task({ priority: 'low', dueDate: k < late ? PAST : '2026-10-20' }),
  );
}

function input(over: Partial<ConditionInput> = {}): ConditionInput {
  return {
    status: 'active',
    dueDate: '2026-10-31',
    tasks: [],
    milestones: [],
    overrides: [],
    today: TODAY,
    now: NOW,
    ...over,
  };
}

function override(over: Partial<ConditionOverride> = {}): ConditionOverride {
  return {
    condition: 'on_track',
    createdAt: new Date('2026-10-06T00:00:00Z'),
    expiresAt: null,
    clearedAt: null,
    ...over,
  };
}

describe('computeCondition', () => {
  test('R03 F07: active project past its due date -> off_track with PAST_DUE days=7', () => {
    const r = computeCondition(input({ dueDate: '2026-09-30', tasks: lowTasks(4, 1) }));
    expect(r?.computed).toEqual({
      condition: 'off_track',
      reasons: [{ code: 'PAST_DUE', days: 7 }],
    });
    expect(r?.effective).toBe('off_track');
  });

  test('R03 F08 / golden Atlas: late high-priority task -> at_risk, IMPORTANT_OVERDUE count=1', () => {
    const atlas = [
      task({ status: 'done', completedAt: NOW }),
      task({ priority: 'high', dueDate: PAST }), // #12
      task({ dueDate: TODAY }), // #14: due today is not late
      task({ dueDate: '2026-10-15' }),
      task({ dueDate: '2026-10-20' }),
      task({ status: 'in_review' }), // #17
      task({ status: 'canceled', canceledAt: NOW }),
    ];
    const r = computeCondition(input({ tasks: atlas }));
    expect(r?.computed).toEqual({
      condition: 'at_risk',
      reasons: [{ code: 'IMPORTANT_OVERDUE', count: 1 }],
    });
    // The other golden figures come from the same rows: 1 of 6 counted done, 5 active, 1 late.
    expect(progress(atlas).percent).toBe(17);
    expect(elapsed('2026-09-01', '2026-10-31', TODAY)?.percent).toBe(60);
    const open = atlas.filter(isActive);
    expect(open).toHaveLength(5);
    expect(open.filter((t) => isOverdue(t, TODAY))).toHaveLength(1);
  });

  test('critical priority also flags; medium does not', () => {
    const crit = computeCondition(
      input({ tasks: [task({ priority: 'critical', dueDate: PAST })] }),
    );
    expect(crit?.computed.reasons[0]).toEqual({ code: 'IMPORTANT_OVERDUE', count: 1 });
    const med = computeCondition(input({ tasks: lowTasks(10, 0).concat(task({ dueDate: PAST })) }));
    expect(med?.computed.reasons).toEqual([]);
  });

  test.each([
    ['R03 F09: 2 late of 10 is exactly 20%, not above', 2, 'on_track', []],
    [
      'R03 F09: 3 late of 10 passes the ratio',
      3,
      'at_risk',
      [{ code: 'OVERDUE_RATIO', late: 3, active: 10 }],
    ],
  ] as [string, number, ProjectCondition, ConditionReason[]][])(
    '%s',
    (_label, late, condition, reasons) => {
      const r = computeCondition(input({ tasks: lowTasks(10, late) }));
      expect(r?.computed).toEqual({ condition, reasons });
    },
  );

  test('trashed, done and canceled tasks never count as active or late', () => {
    const tasks = [
      task({ deletedAt: NOW, dueDate: PAST, priority: 'high' }),
      task({ status: 'done', dueDate: PAST, priority: 'high' }),
      task({ status: 'canceled', dueDate: PAST, priority: 'high' }),
    ];
    expect(computeCondition(input({ tasks }))?.computed.condition).toBe('on_track');
  });

  test('a project without tasks is on_track (no division by zero)', () => {
    expect(computeCondition(input())?.computed).toEqual({ condition: 'on_track', reasons: [] });
  });

  test('no due date can never be PAST_DUE', () => {
    expect(computeCondition(input({ dueDate: null }))?.computed.condition).toBe('on_track');
  });

  test('R03 F10: due date equal to today is not off_track', () => {
    expect(computeCondition(input({ dueDate: TODAY }))?.computed.condition).toBe('on_track');
  });

  test.each(['draft', 'on_hold', 'completed', 'canceled'] as const)(
    'R03 F10: status %s -> null even when late and an override exists',
    (status) => {
      const r = computeCondition(
        input({ status, dueDate: PAST, tasks: lowTasks(5, 5), overrides: [override()] }),
      );
      expect(r).toBeNull();
    },
  );

  test('past due hides smaller reasons (only PAST_DUE is listed)', () => {
    const r = computeCondition(
      input({
        dueDate: PAST,
        tasks: [task({ priority: 'critical', dueDate: PAST })],
        milestones: [{ dueDate: PAST, reachedAt: null }],
      }),
    );
    expect(r?.computed.reasons).toEqual([{ code: 'PAST_DUE', days: 2 }]);
  });

  test('reasons keep the display priority: important, milestone, ratio', () => {
    const tasks = [task({ priority: 'high', dueDate: PAST }), task({ dueDate: PAST })];
    const milestones: ConditionMilestone[] = [{ dueDate: PAST, reachedAt: null }];
    const r = computeCondition(input({ tasks, milestones }));
    expect(r?.computed.reasons.map((x) => x.code)).toEqual([
      'IMPORTANT_OVERDUE',
      'MILESTONE_OVERDUE',
      'OVERDUE_RATIO',
    ]);
  });

  test('R03 F12: an unreached milestone due yesterday -> at_risk MILESTONE_OVERDUE; due today waits', () => {
    const overdue = computeCondition(
      input({ milestones: [{ dueDate: '2026-10-06', reachedAt: null }] }),
    );
    expect(overdue?.computed).toEqual({
      condition: 'at_risk',
      reasons: [{ code: 'MILESTONE_OVERDUE', count: 1 }],
    });
    const waiting = computeCondition(input({ milestones: [{ dueDate: TODAY, reachedAt: null }] }));
    expect(waiting?.computed.condition).toBe('on_track');
    const reached = computeCondition(input({ milestones: [{ dueDate: PAST, reachedAt: NOW }] }));
    expect(reached?.computed.condition).toBe('on_track');
  });

  test('R03 F11: a live override wins as effective while computed stays off_track', () => {
    const ov = override({ condition: 'on_track' });
    const r = computeCondition(input({ dueDate: '2026-09-30', overrides: [ov] }));
    expect(r?.computed.condition).toBe('off_track');
    expect(r?.effective).toBe('on_track');
    expect(r?.override).toBe(ov);
  });

  test.each([
    ['expires exactly now', { expiresAt: NOW }],
    ['expired earlier', { expiresAt: new Date(NOW.getTime() - 1) }],
    ['cleared', { clearedAt: new Date('2026-10-06T10:00:00Z') }],
  ] as [string, Partial<ConditionOverride>][])(
    'R03 F11: an override that is %s is ignored',
    (_l, over) => {
      const r = computeCondition(input({ dueDate: '2026-09-30', overrides: [override(over)] }));
      expect(r?.effective).toBe('off_track');
      expect(r?.override).toBeNull();
    },
  );

  test('honours a custom config instead of the defaults', () => {
    const cfg = { AT_RISK_OVERDUE_RATIO: 0.5, AT_RISK_PRIORITIES: ['critical'] as const };
    const tasks = lowTasks(10, 3).concat(task({ priority: 'high', dueDate: PAST }));
    expect(computeCondition(input({ tasks }), cfg)?.computed.condition).toBe('on_track');
    expect(computeCondition(input({ tasks }), METRICS)?.computed.condition).toBe('at_risk');
  });
});

describe('activeOverride', () => {
  test('picks the newest live override by createdAt, regardless of array order', () => {
    const older = override({ condition: 'at_risk', createdAt: new Date('2026-10-01T00:00:00Z') });
    const newer = override({ condition: 'off_track', createdAt: new Date('2026-10-05T00:00:00Z') });
    expect(activeOverride([newer, older], NOW)).toBe(newer);
    expect(activeOverride([older, newer], NOW)).toBe(newer);
  });

  test('skips a newer cleared row and falls back to the older live one', () => {
    const live = override({ condition: 'at_risk', createdAt: new Date('2026-10-01T00:00:00Z') });
    const cleared = override({ createdAt: new Date('2026-10-05T00:00:00Z'), clearedAt: NOW });
    expect(activeOverride([live, cleared], NOW)).toBe(live);
  });

  test('an override that expires after now is still live', () => {
    const ov = override({ expiresAt: new Date(NOW.getTime() + 1) });
    expect(activeOverride([ov], NOW)).toBe(ov);
  });

  test('returns null for no rows', () => {
    expect(activeOverride([], NOW)).toBeNull();
  });
});

describe('formatConditionReason', () => {
  test.each([
    [{ code: 'IMPORTANT_OVERDUE', count: 1 }, '1 tugas penting terlambat'],
    [{ code: 'PAST_DUE', days: 7 }, 'tenggat lewat 7 hari'],
    [{ code: 'MILESTONE_OVERDUE', count: 2 }, '2 milestone terlewat'],
    [{ code: 'OVERDUE_RATIO', late: 3, active: 10 }, '3 dari 10 tugas aktif terlambat'],
  ] as [ConditionReason, string][])('%o -> %s', (reason, text) => {
    expect(formatConditionReason(reason)).toBe(text);
  });
});
