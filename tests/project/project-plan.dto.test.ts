import { describe, expect, test } from 'bun:test';
import { EXTENSION_REASON_CATEGORIES, PHASE_STATUSES } from '../../server/pm/enums';
import * as limits from '../../server/project/project.limits';
import {
  type ConditionOverrideRow,
  type DeadlineExtensionRow,
  type MilestoneRow,
  type PhaseRow,
  toConditionOverrideDto,
  toDeadlineExtensionDto,
  toMilestoneDto,
  toPhaseDto,
} from '../../server/project/project-plan.dto';

// Frozen contract: the key lists below are written out so a field added or renamed is a deliberate edit,
// because the plan API, the UI and later workers all read these shapes.
const AT = new Date('2026-10-07T05:00:00Z');

const phaseRow: PhaseRow = {
  id: 'ph1',
  projectId: 'p1',
  name: 'Persiapan', // test-only
  description: null,
  position: 2,
  startDate: '2026-10-01',
  endDate: null,
  status: 'in_progress',
  startedAt: AT,
  finishedAt: null,
};

describe('toPhaseDto', () => {
  test('keeps exactly the frozen keys and adds the task counters', () => {
    const dto = toPhaseDto(phaseRow, { taskCount: 5, doneCount: 2 });
    expect(Object.keys(dto).sort()).toEqual(
      [
        'id',
        'projectId',
        'name',
        'description',
        'position',
        'startDate',
        'endDate',
        'status',
        'startedAt',
        'finishedAt',
        'taskCount',
        'doneCount',
      ].sort(),
    );
    expect(dto.taskCount).toBe(5);
    expect(dto.doneCount).toBe(2);
  });

  test('turns instants into ISO strings and keeps nulls as null', () => {
    const dto = toPhaseDto(phaseRow, { taskCount: 0, doneCount: 0 });
    expect(dto.startedAt).toBe('2026-10-07T05:00:00.000Z');
    expect(dto.finishedAt).toBeNull();
    expect(dto.endDate).toBeNull();
    expect(dto.startDate).toBe('2026-10-01');
  });
});

describe('toMilestoneDto', () => {
  const row: MilestoneRow = {
    id: 'm1',
    projectId: 'p1',
    phaseId: null,
    title: 'Rapat awal', // test-only
    description: null,
    dueDate: '2026-11-01',
    reachedAt: null,
  };

  test('keeps exactly the frozen keys', () => {
    expect(Object.keys(toMilestoneDto(row)).sort()).toEqual(
      ['id', 'projectId', 'phaseId', 'title', 'description', 'dueDate', 'reachedAt'].sort(),
    );
  });

  test('reachedAt is null until reached, then an ISO instant', () => {
    expect(toMilestoneDto(row).reachedAt).toBeNull();
    expect(toMilestoneDto({ ...row, reachedAt: AT }).reachedAt).toBe('2026-10-07T05:00:00.000Z');
  });
});

describe('toDeadlineExtensionDto', () => {
  const row: DeadlineExtensionRow = {
    id: 'x1',
    projectId: 'p1',
    oldDueDate: '2026-12-01',
    newDueDate: '2026-12-31',
    reasonCategory: 'scope_change',
    reason: 'Ada pekerjaan tambahan', // test-only
    extendedBy: null,
    createdAt: AT,
  };

  test('keeps exactly the frozen keys; the name is null when the query did not join users', () => {
    const dto = toDeadlineExtensionDto(row);
    expect(Object.keys(dto).sort()).toEqual(
      [
        'id',
        'projectId',
        'oldDueDate',
        'newDueDate',
        'reasonCategory',
        'reason',
        'extendedBy',
        'extendedByName',
        'createdAt',
      ].sort(),
    );
    expect(dto.extendedByName).toBeNull();
    expect(dto.createdAt).toBe('2026-10-07T05:00:00.000Z');
  });

  test('passes the joined author name through', () => {
    const dto = toDeadlineExtensionDto({ ...row, extendedBy: 'u1', extendedByName: 'Sari' }); // test-only
    expect(dto.extendedBy).toBe('u1');
    expect(dto.extendedByName).toBe('Sari'); // test-only
  });
});

describe('toConditionOverrideDto', () => {
  const row: ConditionOverrideRow = {
    id: 'o1',
    projectId: 'p1',
    condition: 'at_risk',
    reason: 'Menunggu persetujuan klien', // test-only
    setBy: 'u1',
    expiresAt: null,
    clearedAt: null,
    createdAt: AT,
  };

  test('keeps exactly the frozen keys', () => {
    expect(Object.keys(toConditionOverrideDto(row)).sort()).toEqual(
      [
        'id',
        'projectId',
        'condition',
        'reason',
        'setBy',
        'setByName',
        'expiresAt',
        'clearedAt',
        'createdAt',
      ].sort(),
    );
  });

  test('maps expiry and clear instants to ISO strings', () => {
    const dto = toConditionOverrideDto({ ...row, expiresAt: AT, clearedAt: AT });
    expect(dto.expiresAt).toBe('2026-10-07T05:00:00.000Z');
    expect(dto.clearedAt).toBe('2026-10-07T05:00:00.000Z');
    expect(dto.setByName).toBeNull();
  });
});

describe('plan enums and limits', () => {
  test('phase statuses and extension reason categories are the agreed values', () => {
    expect([...PHASE_STATUSES]).toEqual(['not_started', 'in_progress', 'done']);
    expect([...EXTENSION_REASON_CATEGORIES]).toEqual([
      'scope_change',
      'dependency',
      'resource',
      'other',
    ]);
  });

  test('limits are positive integers and the phase name limit is 80', () => {
    expect(limits.PHASE_NAME_MAX).toBe(80);
    for (const n of [
      limits.PHASES_PER_PROJECT,
      limits.MILESTONES_PER_PROJECT,
      limits.PHASE_DESCRIPTION_MAX,
      limits.MILESTONE_TITLE_MAX,
      limits.MILESTONE_DESCRIPTION_MAX,
      limits.EXTENSION_REASON_MAX,
      limits.OVERRIDE_REASON_MAX,
    ]) {
      expect(Number.isInteger(n) && n > 0).toBe(true);
    }
  });
});
