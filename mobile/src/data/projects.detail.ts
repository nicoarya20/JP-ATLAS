/**
 * The four detail tabs as the screens read them: Overview, Tasks, Phases and Members of one project.
 *
 * Every getter is synchronous and reads the stores; `ensure*` fills them (§1 of the pattern doc).
 * The tabs do not share one request — the Overview alone is five — so each tab, and inside the
 * Overview each section, carries its own phase and error: one failed read says so in its own place
 * and the rest of the page stays up.
 *
 * The mapping itself lives next door (`projects.api.detail.ts`, `.plan.ts`, `.members.ts`); this
 * file is only about which resources a tab is made of and when they are asked for.
 */
import type { ApiError } from '@/api/errors';

import {
  projectActivity,
  projectDetail,
  projectExtensions,
  projectMembers,
  projectPlan,
} from './projects.api';
import {
  type OverviewActivity,
  type OverviewAttention,
  type OverviewPlan,
  type OverviewProgress,
  overviewActivity,
  overviewPlan,
  overviewProgress,
  projectAttentionRows,
  type SectionState,
} from './projects.api.detail';
import { type CapState, capState } from './projects.api.map';
import { type MembersView, membersView } from './projects.api.members';
import { type PhasesView, phasesView } from './projects.api.plan';
import { type ProjectTaskParams, projectAttentions, projectTaskList } from './projects.api.tasks';
import type { ResourcePhase } from './resource';
import { type TaskCard, cardOf as taskCardOf } from './tasks.api.map';
import { priorityWire, sortWire, statusesOf } from './tasks.api.values';
import { PRIORITIES, type TaskQuery } from './tasks.query';
import type { TaskPriority } from './tasks.shared';
import { viewer } from './viewer';

export type { AttentionRow } from './projects.api.detail';
export { PROJECT_ROLES_LIST } from './projects.api.members';
export type { AttentionReason } from './projects.api.tasks';

const stateOf = (phase: ResourcePhase, error: ApiError | null): SectionState => ({ phase, error });

/* ------------------------------------------------------------------ Overview */

export type ProjectOverview = OverviewProgress & {
  plan: OverviewPlan;
  attention: OverviewAttention;
  activity: OverviewActivity;
};

/** Everything the Overview needs: the plan, the three attention queries and the activity feed. */
export async function ensureProjectOverview(id: string): Promise<void> {
  await Promise.all([
    projectDetail(id).ensure(),
    projectPlan(id).ensure(),
    projectActivity(id).ensure(),
    ...projectAttentions(id).map((r) => r.ensure()),
  ]);
}

/** Fetch one part of the Overview again, for its own Try again. */
export const reloadProjectPlan = (id: string): Promise<unknown> => projectPlan(id).reload();
export const reloadProjectActivity = (id: string): Promise<unknown> => projectActivity(id).reload();
export const moreProjectActivity = (id: string): Promise<void> => projectActivity(id).more();
export const reloadProjectAttention = (id: string): Promise<unknown[]> =>
  Promise.all(projectAttentions(id).map((r) => r.reload()));

/** ⑧ Overview of project `id`; null until its detail has arrived (the header shows the state). */
export function getProjectOverview(id: string): ProjectOverview | null {
  const detail = projectDetail(id).current();
  if (!detail) return null;
  const plan = projectPlan(id).peek();
  const activity = projectActivity(id).peek();
  return {
    ...overviewProgress(detail),
    plan: overviewPlan(plan.data, stateOf(plan.phase, plan.error)),
    attention: projectAttentionRows(id),
    activity: overviewActivity(
      activity.data,
      projectActivity(id).hasMore(),
      stateOf(activity.phase, activity.error),
    ),
  };
}

/** The Overview in a component, re-rendering when any of its stores changes. */
export function useProjectOverview(id: string): ProjectOverview | null {
  projectDetail(id).use();
  projectPlan(id).use();
  projectActivity(id).use();
  for (const r of projectAttentions(id)) r.use();
  return getProjectOverview(id);
}

/* --------------------------------------------------------------------- Tasks */

/** none = the project has no tasks at all; noMatch = the filters or search leave nothing. */
export type TasksEmpty = 'none' | 'noMatch' | null;

export type ProjectTasks = {
  cards: TaskCard[];
  /** "5 tasks loaded", because a keyset page carries no total (GAP A-13). */
  count: string | null;
  empty: TasksEmpty;
  phase: ResourcePhase;
  error: ApiError | null;
  hasMore: boolean;
  /** How + New task must be drawn, from the list's own `caps.createTask`. */
  createTask: CapState;
};

/** The priority a filter index asks for, or none for "All". */
const priorityFilter = (index: number): string[] | undefined => {
  const word = PRIORITIES[index];
  return index && word ? [priorityWire(word as TaskPriority)] : undefined;
};

/** The request the project's Tasks tab makes, from the query its own filter sheet keeps. */
export function projectTaskParams(query: TaskQuery, search: string): ProjectTaskParams {
  const q = search.trim();
  return {
    status: statusesOf(query.status),
    priority: priorityFilter(query.priority),
    assigneeId: query.who ? viewer().userId : undefined,
    q: q || undefined,
    sort: sortWire(query.sort),
  };
}

const taskListOf = (id: string, query: TaskQuery, search: string) =>
  projectTaskList(id, projectTaskParams(query, search));

/** Fetch the project's tasks, unless they are already fresh. */
export const ensureProjectTasks = (
  id: string,
  query: TaskQuery,
  search: string,
): Promise<unknown> => taskListOf(id, query, search).ensure();

export const reloadProjectTasks = (
  id: string,
  query: TaskQuery,
  search: string,
): Promise<unknown> => taskListOf(id, query, search).reload();

export const moreProjectTasks = (id: string, query: TaskQuery, search: string): Promise<void> =>
  taskListOf(id, query, search).more();

/**
 * ⑨ Tasks of project `id` as a list.
 *
 * The per-row action buttons the prototype drew from the task's status ("Start working", "Request
 * review", "Review") are not here: the capability and the step are both on the row (`can`,
 * `primary`), but the writes behind them belong to the Tasks module and are not wired to a screen
 * yet, and the task detail a user would land on is still sample data. A button that reports work it
 * did not do is worse than none, so the row opens the task instead. Listed in
 * `docs/phase2-gap-disembunyikan.md`.
 */
export function getProjectTasks(id: string, query: TaskQuery, search: string): ProjectTasks {
  const list = taskListOf(id, query, search);
  const state = list.peek();
  const items = state.data?.items ?? [];
  const narrowed = !!(query.status || query.priority || query.who || search.trim());
  const n = items.length;
  return {
    cards: items.map(taskCardOf),
    count: state.data ? `${n} task${n === 1 ? '' : 's'} loaded` : null,
    empty: n > 0 || !state.data ? null : narrowed ? 'noMatch' : 'none',
    phase: state.phase,
    error: state.error,
    hasMore: list.hasMore(),
    createTask: capState(
      state.data ? { createTask: state.data.caps.createTask } : undefined,
      'createTask',
    ),
  };
}

/** The project's tasks in a component. */
export function useProjectTasks(id: string, query: TaskQuery, search: string): ProjectTasks {
  taskListOf(id, query, search).use();
  return getProjectTasks(id, query, search);
}

/* -------------------------------------------------------------------- Phases */

export type ProjectPhases = PhasesView & { phase: ResourcePhase; error: ApiError | null };

/** The plan and the deadline history together: the Phases tab shows both. */
export async function ensureProjectPhases(id: string): Promise<void> {
  await Promise.all([
    projectDetail(id).ensure(),
    projectPlan(id).ensure(),
    projectExtensions(id).ensure(),
  ]);
}

export const reloadProjectPhases = (id: string): Promise<unknown[]> =>
  Promise.all([projectPlan(id).reload(), projectExtensions(id).reload()]);

/** ⑩ Phases of project `id`, with its deadline history. */
export function getProjectPhases(id: string): ProjectPhases {
  const plan = projectPlan(id).peek();
  const detail = projectDetail(id).current();
  const extensions = projectExtensions(id).current();
  return {
    ...phasesView(plan.data, detail?.can, detail?.originalDueDate ?? null, extensions),
    phase: plan.phase,
    error: plan.error,
  };
}

/** The Phases tab in a component. */
export function useProjectPhases(id: string): ProjectPhases {
  projectDetail(id).use();
  projectPlan(id).use();
  projectExtensions(id).use();
  return getProjectPhases(id);
}

/* ------------------------------------------------------------------- Members */

export type ProjectMembers = MembersView & { phase: ResourcePhase; error: ApiError | null };

export async function ensureProjectMembers(id: string): Promise<void> {
  await Promise.all([projectDetail(id).ensure(), projectMembers(id).ensure()]);
}

export const reloadProjectMembers = (id: string): Promise<unknown> => projectMembers(id).reload();

/** ⑪ Members of project `id`. */
export function getProjectMembers(id: string): ProjectMembers {
  const list = projectMembers(id).peek();
  const detail = projectDetail(id).current();
  return { ...membersView(list.data, detail?.can), phase: list.phase, error: list.error };
}

/** The Members tab in a component. */
export function useProjectMembers(id: string): ProjectMembers {
  projectDetail(id).use();
  projectMembers(id).use();
  return getProjectMembers(id);
}
