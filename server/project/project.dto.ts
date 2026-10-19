/** Wire shapes for project reads (R04 §3.4): every field is listed, so a new column never leaks by accident. */
import type { ProjectCaps } from '../access/capabilities';
import type { Membership } from '../access/types';
import { type ConditionTask, computeCondition, formatConditionReason } from '../metrics/condition';
import { isoDateIn } from '../metrics/dates';
import { progress } from '../metrics/project.metrics';
import { isActive, isOverdue } from '../metrics/task.metrics';
import type { MetricsConfig } from '../metrics/types';
import type {
  ProjectCondition,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
} from '../pm/enums';
import {
  type ConditionOverrideDto,
  type ConditionPlanInput,
  type DeadlineExtensionDto,
  NO_CONDITION_PLAN,
} from './project-plan.dto';

/** Id and name only: no email or phone leaves through the project API (Q8). */
export type ProjectLead = { id: string; name: string };
export type ProjectProgress = { done: number; total: number; percent: number | null };
/** `reason` is Indonesian text such as "1 tugas penting terlambat"; null when nothing is wrong. */
export type ProjectConditionDto = { level: ProjectCondition; reason: string | null };

export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  lead: ProjectLead | null;
  dueDate: string | null;
  progress: ProjectProgress;
  condition: ProjectConditionDto | null; // only `active` projects have one
  /** The caller's own role; null for an Admin/PM who reads without being a member. */
  myRole: ProjectMemberRole | null;
};

/** Deadline history and the manual condition in force, added to the detail by S5a-03. */
export type ProjectHistory = {
  /** How many times the due date was moved later ("Diperpanjang ×N"). */
  extensionCount: number;
  lastExtension: DeadlineExtensionDto | null;
  /** The manual condition in force; null when none, expired, cleared or the project is not `active`. */
  conditionOverride: ConditionOverrideDto | null;
};

export const NO_HISTORY: ProjectHistory = {
  extensionCount: 0,
  lastExtension: null,
  conditionOverride: null,
};

export type ProjectDetail = ProjectListItem & {
  description: string | null;
  startDate: string | null;
  originalDueDate: string | null;
  /** `live` counts every task not in the Trash, canceled ones too: what a delete would move with it. */
  taskCounts: { active: number; overdue: number; live: number };
  can: ProjectCaps;
} & ProjectHistory;

export type ProjectMemberItem = {
  userId: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
  role: ProjectMemberRole;
  isLead: boolean;
  joinedAt: string; // ISO instant of project_member.created_at
};

/** The project columns the read side selects, plus the lead's name from the join. */
export type ProjectRow = Omit<
  ProjectDetail,
  'lead' | 'progress' | 'condition' | 'myRole' | 'taskCounts' | 'can' | keyof ProjectHistory
> & {
  leadId: string | null;
  leadName: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

/** Row to list item; `lead` is null when the lead account was deleted (FK is SET NULL). */
export function toListItem(
  row: ProjectRow,
  tasks: readonly ConditionTask[],
  membership: Membership,
  now: Date,
  cfg: MetricsConfig,
  plan: ConditionPlanInput = NO_CONDITION_PLAN,
): ProjectListItem {
  const { done, total, percent } = progress(tasks);
  const cond = computeCondition(
    {
      status: row.status,
      dueDate: row.dueDate,
      tasks,
      milestones: plan.milestones,
      overrides: plan.overrides,
      today: isoDateIn(now, cfg.TIME_ZONE),
      now,
    },
    cfg,
  );
  // A manual condition is the manager's own explanation; the computed reasons would contradict it.
  const reason =
    cond?.override?.reason ?? cond?.computed.reasons.map(formatConditionReason).join(', ');
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    priority: row.priority,
    lead: row.leadId && row.leadName ? { id: row.leadId, name: row.leadName } : null,
    dueDate: row.dueDate,
    progress: { done, total, percent },
    condition: cond ? { level: cond.effective, reason: reason || null } : null,
    myRole: membership?.role ?? null,
  };
}

/** List item plus the fields only the detail page needs and the caller's `can{}`. */
export function toDetail(
  row: ProjectRow,
  tasks: readonly ConditionTask[],
  membership: Membership,
  can: ProjectCaps,
  now: Date,
  cfg: MetricsConfig,
  liveTasks = 0,
  plan: ConditionPlanInput = NO_CONDITION_PLAN,
  history: ProjectHistory = NO_HISTORY,
): ProjectDetail {
  const today = isoDateIn(now, cfg.TIME_ZONE);
  return {
    ...toListItem(row, tasks, membership, now, cfg, plan),
    description: row.description,
    startDate: row.startDate,
    originalDueDate: row.originalDueDate,
    ...history,
    taskCounts: {
      active: tasks.filter(isActive).length,
      overdue: tasks.filter((t) => isOverdue(t, today)).length,
      live: liveTasks,
    },
    can,
  };
}
