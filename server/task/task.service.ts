/**
 * Task create and update (S2-04). Each write is one transaction: the task row, its first checklist
 * steps and its `task_activity` rows land together or not at all. Permission comes from the pure
 * policies (`canCreateTask`, `canViewTask`, `canEditTask`); this file only loads rows and writes.
 * Logs carry ids only (C-LOG-1). Deleting a task is not here: the Trash for tasks ships in S6 (X1-Q1).
 */
import { eq } from 'drizzle-orm';
import { levelOf } from '../access/level';
import {
  canCreateTask,
  canEditTask,
  canViewTask,
  resolveNeedsReviewOnCreate,
} from '../access/task.policy';
import type { Principal } from '../access/types';
import { project, task, taskActivity, taskChecklistItem } from '../db/schema';
import { logger } from '../logger';
import { emitTaskAssigned } from '../notification/emit.task';
import type { ProjectPriority } from '../pm/enums';
import type { PmCode } from '../pm/errors';
import { inTx } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import type { TaskClock, TaskDetail } from './task.dto';
import { TASK_ACTIVITY, TASK_WRITE_MESSAGES } from './task.limits';
import { getTaskDetail, resolveTaskRef } from './task-detail.query';
import { checkPhase, phaseChangePayload } from './task-phase.write';
import {
  checkWorker,
  invalid,
  type Refusal,
  refused,
  resolveKind,
  startAfterDue,
} from './task-write.check';

/** Who writes: the policy principal plus the display name stored on activity rows. */
export type TaskAuthor = { principal: Principal; name: string };

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: ProjectPriority;
  /** `YYYY-MM-DD`. */
  dueDate?: string | null;
  startDate?: string | null;
  /** Defaults to the project's "Tugas" kind. */
  kindId?: string;
  /** A phase of the same project (H-B5); omitted or null = no phase. */
  phaseId?: string | null;
  /** First checklist steps, in order. */
  checklist?: readonly string[];
};

/** A partial change; a key left out stays as it is, `null` clears a nullable field. */
export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: ProjectPriority;
  dueDate?: string | null;
  startDate?: string | null;
  kindId?: string;
  /** A phase of the task's own project; `null` takes the task out of its phase. */
  phaseId?: string | null;
};

export type TaskWriteResult =
  | { ok: true; task: TaskDetail }
  | { ok: false; code: PmCode; error?: string };

type Written = Refusal | { ok: true; id: string };

/** The detail the caller now sees; the write just committed, so a miss is a bug, not a 404. */
async function detailOf(p: Principal, w: Written, clock: TaskClock): Promise<TaskWriteResult> {
  if (!w.ok) return w;
  const r = await getTaskDetail(p, w.id, clock);
  if (!r.ok) throw new Error(`Task ${w.id} is not readable right after its write`);
  return r;
}

/** Creates a task with its first checklist steps and a `created` activity row, in one transaction. */
export async function createTask(
  author: TaskAuthor,
  input: CreateTaskInput,
  clock: TaskClock,
): Promise<TaskWriteResult> {
  const p = author.principal;
  const title = input.title.trim();
  const steps = (input.checklist ?? []).map((s) => s.trim());
  if (!title) return invalid(TASK_WRITE_MESSAGES.emptyTitle);
  if (steps.some((s) => !s)) return invalid(TASK_WRITE_MESSAGES.emptyStep);
  if (startAfterDue(input.startDate, input.dueDate)) {
    return invalid(TASK_WRITE_MESSAGES.startAfterDue);
  }

  // Every refusal below returns before the first insert, so nothing is left half written.
  const written = await inTx(async (tx): Promise<Written> => {
    const [proj] = await tx
      .select({
        id: project.id,
        status: project.status,
        leadId: project.leadId,
        deletedAt: project.deletedAt,
        deletedBy: project.deletedBy,
        needsReviewDefault: project.tasksNeedReviewDefault,
      })
      .from(project)
      .where(eq(project.id, input.projectId));
    if (!proj) return refused('NOT_FOUND');
    const m = (await loadMembership(p.id, [proj.id], tx)).get(proj.id) ?? null;
    const allowed = canCreateTask(p, proj, m);
    if (!allowed.ok) return refused(allowed.code);
    const badWorker = input.assigneeId ? await checkWorker(tx, proj.id, input.assigneeId) : null;
    if (badWorker) return badWorker;
    const kindId = await resolveKind(tx, proj.id, input.kindId);
    if (typeof kindId !== 'string') return kindId;
    const badPhase = input.phaseId ? await checkPhase(tx, proj.id, input.phaseId) : null;
    if (badPhase) return badPhase;
    // Always false while the review UI is off (M25); the route already refuses `needsReview: true`.
    const needsReview = resolveNeedsReviewOnCreate({
      projectDefault: proj.needsReviewDefault,
      level: levelOf(p, m),
    }).value;

    const [row] = await tx
      .insert(task)
      .values({
        projectId: proj.id,
        kindId,
        phaseId: input.phaseId ?? null,
        title,
        description: input.description?.trim() || null,
        priority: input.priority ?? 'medium',
        assigneeId: input.assigneeId ?? null,
        needsReview,
        createdBy: p.id,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        lastActivityAt: clock.now,
      })
      .returning({ id: task.id, number: task.number });
    if (!row) throw new Error(`Task insert into project ${proj.id} returned no row`);
    if (steps.length > 0) {
      await tx
        .insert(taskChecklistItem)
        .values(steps.map((text, position) => ({ taskId: row.id, text, position })));
    }
    const acts = await tx
      .insert(taskActivity)
      .values({
        taskId: row.id,
        actorId: p.id,
        actorName: author.name,
        action: TASK_ACTIVITY.created,
        payload: { number: row.number },
      })
      .returning({ id: taskActivity.id, action: taskActivity.action });
    await emitTaskAssigned(tx, row.id, { by: p.id, acts, at: clock.now });
    logger.info({ taskId: row.id, projectId: proj.id, actorId: p.id }, 'task created');
    return { ok: true, id: row.id };
  });
  return detailOf(p, written, clock);
}

type Change = { from: string | null; to: string | null };

/** The columns `input` sets, trimmed; `undefined` keys are left out so they stay unchanged. */
function patchOf(input: UpdateTaskInput) {
  const has = <K extends keyof UpdateTaskInput>(k: K) => input[k] !== undefined;
  return {
    ...(has('title') ? { title: input.title?.trim() ?? '' } : {}),
    ...(has('description') ? { description: input.description?.trim() || null } : {}),
    ...(has('priority') ? { priority: input.priority } : {}),
    ...(has('startDate') ? { startDate: input.startDate ?? null } : {}),
    ...(has('dueDate') ? { dueDate: input.dueDate ?? null } : {}),
    ...(has('assigneeId') ? { assigneeId: input.assigneeId ?? null } : {}),
  };
}

/** Applies a partial change the editor may make; assignee, due date, priority and phase changes each get an activity row. */
export async function updateTask(
  author: TaskAuthor,
  ref: string,
  input: UpdateTaskInput,
  clock: TaskClock,
): Promise<TaskWriteResult> {
  const p = author.principal;
  const next = patchOf(input);
  if (next.title === '') return invalid(TASK_WRITE_MESSAGES.emptyTitle);

  const written = await inTx(async (tx): Promise<Written> => {
    const found = await resolveTaskRef(ref, tx);
    if (!found) return refused('NOT_FOUND');
    const [cur] = await tx
      .select({
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        createdBy: task.createdBy,
        assigneeId: task.assigneeId,
        phaseId: task.phaseId,
        reviewerId: task.reviewerId,
        needsReview: task.needsReview,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        deletedAt: task.deletedAt,
        deletedBy: task.deletedBy,
      })
      .from(task)
      .where(eq(task.id, found.id))
      // Serialises concurrent edits of one task so each activity row records the value it replaced.
      .for('update');
    if (!cur) return refused('NOT_FOUND');
    const subject = { ...cur, projectDeletedAt: null };
    const m = (await loadMembership(p.id, [cur.projectId], tx)).get(cur.projectId) ?? null;
    // View first: a hidden task must look missing, never "forbidden" (capabilities.ts ORDER RULE).
    if (!canViewTask(p, subject, m).ok) return refused('NOT_FOUND');
    const allowed = canEditTask(p, subject, m);
    if (!allowed.ok) return refused(allowed.code);

    const start = next.startDate !== undefined ? next.startDate : cur.startDate;
    const due = next.dueDate !== undefined ? next.dueDate : cur.dueDate;
    if (startAfterDue(start, due)) return invalid(TASK_WRITE_MESSAGES.startAfterDue);
    if (next.assigneeId && next.assigneeId !== cur.assigneeId) {
      const badWorker = await checkWorker(tx, cur.projectId, next.assigneeId);
      if (badWorker) return badWorker;
    }
    const kindId = input.kindId ? await resolveKind(tx, cur.projectId, input.kindId) : undefined;
    if (kindId !== undefined && typeof kindId !== 'string') return kindId;
    const badPhase = input.phaseId ? await checkPhase(tx, cur.projectId, input.phaseId) : null;
    if (badPhase) return badPhase;
    const phase = input.phaseId === undefined ? {} : { phaseId: input.phaseId };
    const set = { ...next, ...(kindId ? { kindId } : {}), ...phase };
    if (Object.keys(set).length === 0) return { ok: true, id: cur.id };

    const changes: Array<[string, Change]> = [];
    const track = (action: string, from: string | null, to: string | null | undefined) => {
      if (to !== undefined && to !== from) changes.push([action, { from, to }]);
    };
    // Becoming the assignee is what gives a Member edit rights (T-A2 'own'), so it is always recorded.
    track(TASK_ACTIVITY.assigneeChanged, cur.assigneeId, next.assigneeId);
    track(TASK_ACTIVITY.dueDateChanged, cur.dueDate, next.dueDate);
    track(TASK_ACTIVITY.priorityChanged, cur.priority, next.priority);
    if (input.phaseId !== undefined && input.phaseId !== cur.phaseId) {
      const moved = await phaseChangePayload(tx, cur.phaseId, input.phaseId);
      changes.push([TASK_ACTIVITY.phaseChanged, moved]);
    }

    await tx
      .update(task)
      .set({ ...set, lastActivityAt: clock.now })
      .where(eq(task.id, cur.id));
    if (changes.length > 0) {
      const acts = await tx
        .insert(taskActivity)
        .values(
          changes.map(([action, payload]) => ({
            taskId: cur.id,
            actorId: p.id,
            actorName: author.name,
            action,
            payload,
          })),
        )
        .returning({ id: taskActivity.id, action: taskActivity.action });
      await emitTaskAssigned(tx, cur.id, { by: p.id, acts, was: cur.assigneeId, at: clock.now });
    }
    logger.info({ taskId: cur.id, actorId: p.id, fields: Object.keys(set) }, 'task updated');
    return { ok: true, id: cur.id };
  });
  return detailOf(p, written, clock);
}
