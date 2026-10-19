import { describe, expect, it } from 'bun:test';
import { OVERRIDE_REASON_MAX } from '@server/project/project.limits';
import { ConditionOverrideView } from '../../app/components/projects/summary/ConditionOverrideModal';
import {
  EMPTY_OVERRIDE,
  endOfDayInstant,
  type OverrideValues,
  overrideBlocker,
  toOverrideInput,
} from '../../app/components/projects/summary/condition-override';
import {
  canClearCondition,
  canExtendDeadline,
  canSetCondition,
} from '../../app/components/projects/summary/header-caps';
import { hasMenu } from '../../app/components/projects/summary/ProjectMenu';
import { OVERRIDE_COPY } from '../../app/components/projects/summary/summary.copy';
import { CONDITION_LABELS } from '../../app/lib/pm-labels';
import { render } from './project-fixtures';

const TODAY = '2026-10-07'; // test-only
const valid: OverrideValues = { condition: 'at_risk', reason: 'Menunggu izin', until: null };

describe('overrideBlocker', () => {
  it('asks for a condition, then a reason, and refuses an end day in the past', () => {
    expect(overrideBlocker(EMPTY_OVERRIDE, TODAY)).toBe(OVERRIDE_COPY.needCondition);
    expect(overrideBlocker({ ...valid, reason: '  ' }, TODAY)).toBe(OVERRIDE_COPY.needReason);
    expect(overrideBlocker({ ...valid, until: '2026-10-06' }, TODAY)).toBe(OVERRIDE_COPY.pastEnd);
    expect(overrideBlocker({ ...valid, until: TODAY }, TODAY)).toBeNull();
    expect(overrideBlocker(valid, TODAY)).toBeNull();
  });

  it('refuses a reason longer than the server accepts', () => {
    const reason = 'a'.repeat(OVERRIDE_REASON_MAX + 1);
    expect(overrideBlocker({ ...valid, reason }, TODAY)).toBe(
      OVERRIDE_COPY.tooLong(OVERRIDE_REASON_MAX),
    );
  });
});

describe('toOverrideInput', () => {
  it('sends no end time when none is chosen, and the end of the team day when one is', () => {
    expect(toOverrideInput(valid, TODAY)).toEqual({
      condition: 'at_risk',
      reason: 'Menunggu izin',
      expiresAt: null,
    });
    // Asia/Jakarta is UTC+7, so the day ends at 16:59:59 UTC.
    expect(endOfDayInstant('2026-10-31')).toBe('2026-10-31T16:59:59.000Z');
    expect(toOverrideInput({ ...valid, until: '2026-10-31' }, TODAY)?.expiresAt).toBe(
      '2026-10-31T16:59:59.000Z',
    );
  });

  it('computes the end of day for another zone too', () => {
    expect(endOfDayInstant('2026-01-15', 'UTC')).toBe('2026-01-15T23:59:59.000Z');
    expect(endOfDayInstant('2026-01-15', 'America/New_York')).toBe('2026-01-16T04:59:59.000Z');
  });

  it('is null while the form is not valid', () => {
    expect(toOverrideInput(EMPTY_OVERRIDE, TODAY)).toBeNull();
  });
});

const view = (
  values: OverrideValues,
  over: Partial<Parameters<typeof ConditionOverrideView>[0]> = {},
) =>
  render(
    <ConditionOverrideView
      today={TODAY}
      values={values}
      onChange={() => {}}
      blocker={overrideBlocker(values, TODAY)}
      error={null}
      loading={false}
      onSubmit={() => {}}
      onCancel={() => {}}
      {...over}
    />,
  );

const submitTag = (html: string) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)]
    .map((m) => m[0])
    .find((b) => b.includes(OVERRIDE_COPY.submit))
    ?.match(/<button\b[^>]*>/)?.[0];

describe('ConditionOverrideView', () => {
  it('offers the three conditions with icon and words, and keeps submit off with the reason shown', async () => {
    const html = await view(EMPTY_OVERRIDE);
    for (const c of ['on_track', 'at_risk', 'off_track'] as const) {
      expect(html).toContain(CONDITION_LABELS[c].label);
    }
    expect(submitTag(html)).toContain('disabled');
    expect(html).toContain(OVERRIDE_COPY.needCondition);
  });

  it('turns submit on when a condition and a reason are given, and shows a failed send', async () => {
    const ok = await view(valid);
    expect(submitTag(ok)).not.toContain('disabled');
    const failed = await view(valid, {
      error: 'Kondisi manual hanya bisa dipasang pada proyek yang sedang berjalan.',
    });
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('hanya bisa dipasang pada proyek yang sedang berjalan');
  });
});

describe('header capabilities', () => {
  const base = {
    can: { update: true as const },
    status: 'active' as const,
    conditionOverride: null,
  };

  it('lets only a manager (can.update === true) set a condition, only on a running project', () => {
    expect(canSetCondition(base)).toBe(true);
    expect(canSetCondition({ ...base, can: { update: 'NOT_MANAGER' } })).toBe(false);
    expect(canSetCondition({ ...base, can: {} })).toBe(false);
    for (const status of ['draft', 'on_hold', 'completed', 'canceled'] as const) {
      expect(canSetCondition({ ...base, status })).toBe(false);
    }
  });

  it('offers to clear only while a manual condition is in force', () => {
    expect(canClearCondition(base)).toBe(false);
    const withOverride = { ...base, conditionOverride: {} as never };
    expect(canClearCondition(withOverride)).toBe(true);
    expect(canClearCondition({ ...withOverride, can: {} })).toBe(false);
  });

  it('extends only unfinished projects with a due date', () => {
    const p = { can: { update: true as const }, status: 'on_hold' as const, dueDate: '2026-10-31' };
    expect(canExtendDeadline(p)).toBe(true);
    expect(canExtendDeadline({ ...p, dueDate: null })).toBe(false);
    expect(canExtendDeadline({ ...p, status: 'completed' })).toBe(false);
  });

  it('draws the ⋯ menu only when it would hold an item', () => {
    const none = { id: 'p', name: 'P', can: {}, taskCounts: { active: 0, overdue: 0, live: 0 } };
    expect(hasMenu({ ...none, status: 'active', conditionOverride: null })).toBe(false);
    expect(
      hasMenu({ ...none, can: { update: true }, status: 'completed', conditionOverride: null }),
    ).toBe(true);
  });
});
