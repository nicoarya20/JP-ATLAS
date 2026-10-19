import { describe, expect, test } from 'bun:test';
import {
  type ConditionInput,
  type ConditionMilestone,
  type ConditionOverride,
  type ConditionReason,
  type ConditionTask,
  computeCondition,
  formatConditionReason,
} from '../../server/metrics/condition';
import type { ProjectCondition, ProjectStatus } from '../../server/pm/enums';

// L5-02: project condition once S5 feeds real milestones and manual overrides (R03 §Kondisi, X2 §2).
const NOW = new Date('2026-10-07T05:00:00Z');
const TODAY = '2026-10-07';
const PAST = '2026-10-05';
const FUTURE = '2026-10-20';

function task(over: Partial<ConditionTask> = {}): ConditionTask {
  return {
    status: 'in_progress',
    deletedAt: null,
    dueDate: FUTURE,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    completedAt: null,
    canceledAt: null,
    lastActivityAt: NOW,
    reopenCount: 0,
    priority: 'low',
    ...over,
  };
}

/** `n` active low-priority tasks, `late` of them overdue. */
const lowTasks = (n: number, late: number) =>
  Array.from({ length: n }, (_, k) => task({ dueDate: k < late ? PAST : FUTURE }));

const milestone = (dueDate: string, reachedAt: Date | null = null): ConditionMilestone => ({
  dueDate,
  reachedAt,
});

const override = (over: Partial<ConditionOverride> = {}): ConditionOverride => ({
  condition: 'on_track',
  createdAt: new Date('2026-10-06T00:00:00Z'),
  expiresAt: null,
  clearedAt: null,
  ...over,
});

const input = (over: Partial<ConditionInput> = {}): ConditionInput => ({
  status: 'active',
  dueDate: '2026-10-31',
  tasks: [],
  milestones: [],
  overrides: [],
  today: TODAY,
  now: NOW,
  ...over,
});

type Case = {
  name: string;
  input: Partial<ConditionInput>;
  computed: ProjectCondition;
  reasons: ConditionReason[];
  effective: ProjectCondition;
};

const CASES: Case[] = [
  {
    name: '1. due date passed -> Terlambat only, even with a missed milestone and late tasks',
    input: {
      dueDate: PAST,
      milestones: [milestone(PAST)],
      tasks: [task({ priority: 'high', dueDate: PAST })],
    },
    computed: 'off_track',
    reasons: [{ code: 'PAST_DUE', days: 2 }],
    effective: 'off_track',
  },
  {
    name: '2. a missed milestone -> Perlu perhatian',
    input: { milestones: [milestone(PAST)] },
    computed: 'at_risk',
    reasons: [{ code: 'MILESTONE_OVERDUE', count: 1 }],
    effective: 'at_risk',
  },
  {
    name: '3. a milestone due today is still waiting',
    input: { milestones: [milestone(TODAY)] },
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
  {
    name: '4. a milestone reached late does not flag',
    input: { milestones: [milestone(PAST, new Date('2026-10-06T00:00:00Z'))] },
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
  {
    name: '5. important late task plus missed milestone -> two reasons in order',
    input: {
      tasks: [task({ priority: 'high', dueDate: PAST }), ...lowTasks(9, 0)],
      milestones: [milestone(PAST), milestone('2026-10-01')],
    },
    computed: 'at_risk',
    reasons: [
      { code: 'IMPORTANT_OVERDUE', count: 1 },
      { code: 'MILESTONE_OVERDUE', count: 2 },
    ],
    effective: 'at_risk',
  },
  {
    name: '6. exactly 20% late is still on track',
    input: { tasks: lowTasks(10, 2) },
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
  {
    name: '7. above 20% late (3 of 14) -> Perlu perhatian',
    input: { tasks: lowTasks(14, 3) },
    computed: 'at_risk',
    reasons: [{ code: 'OVERDUE_RATIO', late: 3, active: 14 }],
    effective: 'at_risk',
  },
  {
    name: '8. an active override replaces the computed condition but computed stays visible',
    input: { milestones: [milestone(PAST)], overrides: [override({ condition: 'on_track' })] },
    computed: 'at_risk',
    reasons: [{ code: 'MILESTONE_OVERDUE', count: 1 }],
    effective: 'on_track',
  },
  {
    name: '9. an override expiring exactly at now is ignored',
    input: { overrides: [override({ condition: 'off_track', expiresAt: NOW })] },
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
  {
    name: '9b. an override expiring one millisecond after now still applies',
    input: {
      overrides: [override({ condition: 'off_track', expiresAt: new Date(NOW.getTime() + 1) })],
    },
    computed: 'on_track',
    reasons: [],
    effective: 'off_track',
  },
  {
    name: '10. a cleared override is ignored',
    input: {
      overrides: [
        override({ condition: 'off_track', clearedAt: new Date('2026-10-06T12:00:00Z') }),
      ],
    },
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
  {
    name: '12. two active overrides -> the newest wins',
    input: {
      overrides: [
        override({ condition: 'off_track', createdAt: new Date('2026-10-05T00:00:00Z') }),
        override({ condition: 'at_risk', createdAt: new Date('2026-10-06T00:00:00Z') }),
      ],
    },
    computed: 'on_track',
    reasons: [],
    effective: 'at_risk',
  },
  {
    name: '13. no tasks and no milestones -> on track',
    input: {},
    computed: 'on_track',
    reasons: [],
    effective: 'on_track',
  },
];

describe('computeCondition with milestones and overrides (L5-02)', () => {
  test.each(CASES)('$name', (c) => {
    const r = computeCondition(input(c.input));
    expect(r?.computed).toEqual({ condition: c.computed, reasons: c.reasons });
    expect(r?.effective).toBe(c.effective);
  });

  test('12 (detail): the newest override is the one returned, whatever the input order', () => {
    const older = override({ condition: 'off_track', createdAt: new Date('2026-10-05T00:00:00Z') });
    const newer = override({ condition: 'at_risk', createdAt: new Date('2026-10-06T00:00:00Z') });
    expect(computeCondition(input({ overrides: [older, newer] }))?.override).toBe(newer);
    expect(computeCondition(input({ overrides: [newer, older] }))?.override).toBe(newer);
  });

  test.each(['draft', 'on_hold', 'completed', 'canceled'] satisfies ProjectStatus[])(
    '11. a %s project has no condition, an active override included',
    (status) => {
      const r = computeCondition(
        input({
          status,
          milestones: [milestone(PAST)],
          overrides: [override({ condition: 'off_track' })],
        }),
      );
      expect(r).toBeNull();
    },
  );
});

describe('formatConditionReason (L5-02)', () => {
  test.each([
    [{ code: 'PAST_DUE', days: 7 }, 'tenggat lewat 7 hari'],
    [{ code: 'IMPORTANT_OVERDUE', count: 2 }, '2 tugas penting terlambat'],
    [{ code: 'MILESTONE_OVERDUE', count: 1 }, '1 milestone terlewat'],
    [{ code: 'OVERDUE_RATIO', late: 3, active: 14 }, '3 dari 14 tugas aktif terlambat'],
  ] satisfies [ConditionReason, string][])(
    '%o -> one short Indonesian sentence',
    (reason, text) => {
      const out = formatConditionReason(reason);
      expect(out).toBe(text);
      expect(out).not.toContain(',');
    },
  );

  test('two reasons yield two separate texts, in the same order as the reasons', () => {
    const r = computeCondition(
      input({
        tasks: [task({ priority: 'critical', dueDate: PAST }), ...lowTasks(9, 0)],
        milestones: [milestone(PAST)],
      }),
    );
    expect(r?.computed.reasons.map(formatConditionReason)).toEqual([
      '1 tugas penting terlambat',
      '1 milestone terlewat',
    ]);
  });
});
