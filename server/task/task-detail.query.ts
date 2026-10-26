/**
 * Task detail and reference resolution (S2-02). A task the viewer may not see, a trashed task and
 * a task in a trashed project all answer the same `NOT_FOUND` as an id that never existed (IDOR).
 */
import { and, asc, eq, type SQL } from 'drizzle-orm';
import { canViewTask } from '../access/task.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project, projectPhase, task, taskChecklistItem, taskKind } from '../db/schema';
import type { Executor } from '../pm/tx';
import { loadMembership, loadReviewerPool } from '../project/membership.query';
import type { TaskClock, TaskDetail, TaskDetailResult } from './task.dto';
import { loadPeople } from './task.lookup.query';
import { cardColumns, liveTask, onTaskPhase } from './task.sql';
import { phaseOf, subjectOf, viewOf } from './task.view';

// Task numbers are bigint identities read as JS numbers, so more digits than this cannot be exact.
const MAX_REF_DIGITS = 15;
const DIGITS = /^\d+$/;

/** Condition for a `:ref`: all digits is the global task number, anything else a task id (M16). */
function refCondition(ref: string): SQL | null {
  if (!DIGITS.test(ref)) return eq(task.id, ref);
  return ref.length > MAX_REF_DIGITS ? null : eq(task.number, Number(ref));
}

/** Id, project and number of the live task a `:ref` names, or null; visibility is the caller's check. */
export async function resolveTaskRef(
  ref: string,
  exec: Executor = db,
): Promise<{ id: string; projectId: string; number: number } | null> {
  const byRef = refCondition(ref);
  if (!byRef) return null;
  const [row] = await exec
    .select({ id: task.id, projectId: task.projectId, number: task.number })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(and(liveTask, byRef));
  return row ?? null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * The task a `:ref` names, with checklist, labels, `can{}` and the primary action. The view check
 * comes before anything else is loaded, and its refusal looks exactly like a missing task.
 */
export async function getTaskDetail(
  p: Principal,
  ref: string,
  clock: TaskClock,
  exec: Executor = db,
): Promise<TaskDetailResult> {
  const notFound = { ok: false, code: 'NOT_FOUND' } as const;
  const byRef = refCondition(ref);
  if (!byRef) return notFound;
  const [row] = await exec
    .select({
      ...cardColumns,
      description: task.description,
      startDate: task.startDate,
      startedAt: task.startedAt,
      cancelCategory: task.cancelCategory,
      cancelNote: task.cancelNote,
      kindId: taskKind.id,
      kindName: taskKind.name,
      kindBase: taskKind.baseKind,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .innerJoin(taskKind, eq(taskKind.id, task.kindId))
    .leftJoin(projectPhase, onTaskPhase)
    .where(and(liveTask, byRef));
  if (!row) return notFound;

  const membership = (await loadMembership(p.id, [row.projectId], exec)).get(row.projectId) ?? null;
  if (!canViewTask(p, subjectOf(row), membership).ok) return notFound;

  const [items, people, pool] = await Promise.all([
    exec
      .select({
        id: taskChecklistItem.id,
        text: taskChecklistItem.text,
        isDone: taskChecklistItem.isDone,
        position: taskChecklistItem.position,
      })
      .from(taskChecklistItem)
      .where(eq(taskChecklistItem.taskId, row.id))
      .orderBy(asc(taskChecklistItem.position), asc(taskChecklistItem.id)),
    loadPeople([row.assigneeId, row.createdBy, row.reviewerId], exec),
    loadReviewerPool(row.projectId, exec),
  ]);
  const { labels, can, primary } = viewOf(p, row, membership, pool, clock);
  const person = (id: string | null) => (id ? (people.get(id) ?? null) : null);
  const detail: TaskDetail = {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    assignee: person(row.assigneeId),
    project: { id: row.projectId, name: row.projectName, status: row.projectStatus },
    labels,
    primary,
    can,
    description: row.description,
    startDate: row.startDate,
    kind: { id: row.kindId, name: row.kindName, baseKind: row.kindBase },
    phase: phaseOf(row),
    creator: person(row.createdBy),
    reviewer: person(row.reviewerId),
    needsReview: row.needsReview,
    reopenCount: row.reopenCount,
    cancel: row.cancelCategory ? { category: row.cancelCategory, note: row.cancelNote } : null,
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    canceledAt: iso(row.canceledAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    checklist: { done: items.filter((i) => i.isDone).length, total: items.length, items },
  };
  return { ok: true, task: detail };
}
