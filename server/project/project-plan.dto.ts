/**
 * Frozen wire shapes for the project plan (S5a): phases, milestones, deadline extensions and condition
 * overrides. Pure and browser-safe (types plus row mappers, no DB import), so the API, the UI and tests
 * share one contract. Field names follow R02: `title`, `endDate`, `oldDueDate`, `extendedBy`, `setBy`.
 */
import type { ConditionMilestone, ConditionOverride } from '../metrics/condition';
import type { ExtensionReasonCategory, PhaseStatus, ProjectCondition } from '../pm/enums';

/** Counters the service computes per phase: live tasks that point at it, and how many of those are done. */
export type PhaseCounts = { taskCount: number; doneCount: number };

export type PhaseDto = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  /** 0-based display order inside the project; not unique, see `project_phase.position`. */
  position: number;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  status: PhaseStatus;
  startedAt: string | null; // ISO instant
  finishedAt: string | null; // ISO instant
  taskCount: number;
  doneCount: number;
};

export type MilestoneDto = {
  id: string;
  projectId: string;
  phaseId: string | null;
  title: string;
  description: string | null;
  dueDate: string; // YYYY-MM-DD
  reachedAt: string | null; // ISO instant; null = not reached yet
};

export type DeadlineExtensionDto = {
  id: string;
  projectId: string;
  oldDueDate: string; // YYYY-MM-DD
  newDueDate: string; // YYYY-MM-DD
  reasonCategory: ExtensionReasonCategory;
  reason: string;
  /** Account id; null once that account was deleted (FK is SET NULL). */
  extendedBy: string | null;
  /** Display name from the join; null when the account is gone or the query did not join users. */
  extendedByName: string | null;
  createdAt: string; // ISO instant
};

export type ConditionOverrideDto = {
  id: string;
  projectId: string;
  condition: ProjectCondition;
  reason: string;
  setBy: string | null;
  setByName: string | null;
  expiresAt: string | null; // ISO instant; null = until cleared by hand
  clearedAt: string | null; // ISO instant
  createdAt: string; // ISO instant
};

// Row shapes are written out (not `$inferSelect`) so this file never imports the DB schema.
export type PhaseRow = Omit<PhaseDto, 'startedAt' | 'finishedAt' | 'taskCount' | 'doneCount'> & {
  startedAt: Date | null;
  finishedAt: Date | null;
};
export type MilestoneRow = Omit<MilestoneDto, 'reachedAt'> & { reachedAt: Date | null };
export type DeadlineExtensionRow = Omit<DeadlineExtensionDto, 'createdAt' | 'extendedByName'> & {
  createdAt: Date;
  extendedByName?: string | null;
};
export type ConditionOverrideRow = Omit<
  ConditionOverrideDto,
  'expiresAt' | 'clearedAt' | 'createdAt' | 'setByName'
> & {
  expiresAt: Date | null;
  clearedAt: Date | null;
  createdAt: Date;
  setByName?: string | null;
};

/** An override as `computeCondition` reads it, with the manager's own sentence kept for display. */
export type ConditionOverrideInput = ConditionOverride & { readonly reason: string };

/** What the S5 condition needs besides tasks: the project's milestones and its not-cleared overrides. */
export type ConditionPlanInput = {
  readonly milestones: readonly ConditionMilestone[];
  readonly overrides: readonly ConditionOverrideInput[];
};

/** Plan input of a project with no milestones and no overrides. */
export const NO_CONDITION_PLAN: ConditionPlanInput = { milestones: [], overrides: [] };

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toPhaseDto(row: PhaseRow, counts: PhaseCounts): PhaseDto {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    position: row.position,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    taskCount: counts.taskCount,
    doneCount: counts.doneCount,
  };
}

export function toMilestoneDto(row: MilestoneRow): MilestoneDto {
  return {
    id: row.id,
    projectId: row.projectId,
    phaseId: row.phaseId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    reachedAt: iso(row.reachedAt),
  };
}

export function toDeadlineExtensionDto(row: DeadlineExtensionRow): DeadlineExtensionDto {
  return {
    id: row.id,
    projectId: row.projectId,
    oldDueDate: row.oldDueDate,
    newDueDate: row.newDueDate,
    reasonCategory: row.reasonCategory,
    reason: row.reason,
    extendedBy: row.extendedBy,
    extendedByName: row.extendedByName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toConditionOverrideDto(row: ConditionOverrideRow): ConditionOverrideDto {
  return {
    id: row.id,
    projectId: row.projectId,
    condition: row.condition,
    reason: row.reason,
    setBy: row.setBy,
    setByName: row.setByName ?? null,
    expiresAt: iso(row.expiresAt),
    clearedAt: iso(row.clearedAt),
    createdAt: row.createdAt.toISOString(),
  };
}
