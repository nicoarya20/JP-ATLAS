/**
 * Task status workflow (S2-05): start, unstart, complete, reopen, cancel, uncancel. Which step is legal
 * comes from `TASK_TRANSITIONS` and who may take it from the `can*Task` policies; this file only loads
 * the row and writes. The write is a conditional UPDATE on the status that was read, so of two people
 * acting at once one wins and the other gets `STATE_CONFLICT` instead of a silent overwrite.
 * Logs carry ids only (C-LOG-1); a reason or note lands in `task_activity`, never in a log line.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { type TaskCaps, taskCaps } from '../access/capabilities';
import { canViewTask } from '../access/task.policy';
import {
  type CancelInput,
  canCancelTask,
  canCompleteTask,
  canReopenTask,
  canStartTask,
  canUncancelTask,
  canUnstartTask,
  type FlowDecision,
  TASK_TRANSITIONS,
} from '../access/task-flow.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { task, taskActivity } from '../db/schema';
import { logger } from '../logger';
import type { TaskCancelCategory, TaskStatus } from '../pm/enums';
import type { PmCode } from '../pm/errors';
import { inTx } from '../pm/tx';
import { loadMembership, loadReviewerPool } from '../project/membership.query';
import type { TaskClock } from './task.dto';
import { ENABLED_TASK_ACTIONS, type EnabledTaskAction, TASK_ACTIVITY } from './task.limits';
import type { TaskAuthor } from './task.service';
import { resolveTaskRef } from './task-detail.query';

/** What a step may carry: `reason` for reopen, `category` (+ `note` for "other") for cancel. */
export type TransitionInput = { reason?: string; category?: TaskCancelCategory; note?: string };

/** The task's workflow state right after the step, read from the UPDATE's `RETURNING` row. */
export type TaskState = {
  id: string;
  number: number;
  status: TaskStatus;
  assigneeId: string | null;
  needsReview: boolean;
  reopenCount: number;
  cancel: { category: TaskCancelCategory; note: string | null } | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  lastActivityAt: string;
};

export type TransitionResult =
  | { ok: true; task: TaskState; can: TaskCaps }
  | { ok: false; code: PmCode };

const refused = (code: PmCode) => ({ ok: false, code }) as const;
const iso = (d: Date | null) => (d ? d.toISOString() : null);

/** The policy that decides `action`; each one also checks the input the step needs. */
function decide(
  p: Principal,
  subject: TaskSubject,
  m: Membership,
  action: EnabledTaskAction,
  input: TransitionInput,
): FlowDecision {
  switch (action) {
    case 'start':
      return canStartTask(p, subject, m);
    case 'unstart':
      return canUnstartTask(p, subject, m);
    case 'complete':
      return canCompleteTask(p, subject, m);
    case 'reopen':
      return canReopenTask(p, subject, m, input.reason ?? '');
    case 'cancel': {
      // `applyTransition` refuses a cancel without a category before it gets here.
      const cancel: CancelInput = { category: input.category ?? 'other', note: input.note ?? '' };
      return canCancelTask(p, subject, m, cancel);
    }
    case 'uncancel':
      return canUncancelTask(p, subject, m);
  }
}

/** Columns a step sets besides `status`; timestamps follow R03 §3.4 (started once, completed set/cleared). */
function columnsFor(action: EnabledTaskAction, to: TaskStatus, input: TransitionInput, now: Date) {
  const stamp = sql`${now.toISOString()}::timestamptz`;
  return {
    // `started_at` keeps the first start: unstarting or reopening never moves it.
    ...(to === 'in_progress' ? { startedAt: sql`coalesce(${task.startedAt}, ${stamp})` } : {}),
    ...(to === 'done' ? { completedAt: now } : {}),
    ...(action === 'reopen'
      ? { completedAt: null, reopenCount: sql`${task.reopenCount} + 1` }
      : {}),
    ...(action === 'cancel'
      ? { cancelCategory: input.category, cancelNote: input.note?.trim() || null, canceledAt: now }
      : {}),
    ...(action === 'uncancel' ? { cancelCategory: null, cancelNote: null, canceledAt: null } : {}),
  };
}

/** What the activity row records: the pair, plus the reason or cancel category the step carried. */
function payloadOf(
  action: EnabledTaskAction,
  from: TaskStatus,
  to: TaskStatus,
  i: TransitionInput,
) {
  if (action === 'reopen') return { from, to, reason: i.reason?.trim() ?? '' };
  if (action === 'cancel') return { from, to, category: i.category, note: i.note?.trim() || null };
  return { from, to };
}

/**
 * Moves the task `ref` names one workflow step for `author`. A hidden or missing task answers
 * `NOT_FOUND`; a step that is not open from the current status `WRONG_STATE` (or `REVIEW_REQUIRED`);
 * a status changed by someone else between the read and the write `STATE_CONFLICT`.
 */
export async function applyTransition(
  author: TaskAuthor,
  ref: string,
  action: EnabledTaskAction,
  input: TransitionInput,
  clock: TaskClock,
): Promise<TransitionResult> {
  const p = author.principal;
  if (!ENABLED_TASK_ACTIONS.includes(action)) return refused('NOT_FOUND');
  if (action === 'cancel' && !input.category) return refused('VALIDATION');

  return inTx(async (tx): Promise<TransitionResult> => {
    const found = await resolveTaskRef(ref, tx);
    if (!found) return refused('NOT_FOUND');
    // No row lock on purpose: the conditional UPDATE below is the concurrency check.
    const [cur] = await tx
      .select({
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        createdBy: task.createdBy,
        assigneeId: task.assigneeId,
        reviewerId: task.reviewerId,
        needsReview: task.needsReview,
        deletedAt: task.deletedAt,
        deletedBy: task.deletedBy,
      })
      .from(task)
      .where(eq(task.id, found.id));
    if (!cur) return refused('NOT_FOUND');
    const subject: TaskSubject = { ...cur, projectDeletedAt: null };
    const m = (await loadMembership(p.id, [cur.projectId], tx)).get(cur.projectId) ?? null;
    // View first: a hidden task must look missing, never "forbidden" (capabilities.ts ORDER RULE).
    if (!canViewTask(p, subject, m).ok) return refused('NOT_FOUND');
    const decision = decide(p, subject, m, action, input);
    if (!decision.ok) return refused(decision.code);
    const step = TASK_TRANSITIONS.find((t) => t.action === action && t.from === cur.status);
    if (!step) throw new Error(`Policy allowed ${action} from ${cur.status} without a transition`);

    const takesOver = 'effects' in decision && decision.effects?.includes('BECOMES_ASSIGNEE');
    const [row] = await tx
      .update(task)
      .set({
        status: step.to,
        ...columnsFor(action, step.to, input, clock.now),
        ...(takesOver ? { assigneeId: p.id } : {}),
        lastActivityAt: clock.now,
      })
      .where(and(eq(task.id, cur.id), eq(task.status, step.from), isNull(task.deletedAt)))
      .returning();
    if (!row) return refused('STATE_CONFLICT');

    await tx.insert(taskActivity).values({
      taskId: row.id,
      actorId: p.id,
      actorName: author.name,
      action: TASK_ACTIVITY[action],
      payload: payloadOf(action, step.from, step.to, input),
    });
    const pool = await loadReviewerPool(row.projectId, tx);
    const can = taskCaps(
      p,
      { ...subject, status: row.status, assigneeId: row.assigneeId },
      m,
      pool,
    );
    logger.info({ taskId: row.id, actorId: p.id, action }, 'task status changed');
    return {
      ok: true,
      task: {
        id: row.id,
        number: row.number,
        status: row.status,
        assigneeId: row.assigneeId,
        needsReview: row.needsReview,
        reopenCount: row.reopenCount,
        cancel: row.cancelCategory ? { category: row.cancelCategory, note: row.cancelNote } : null,
        startedAt: iso(row.startedAt),
        completedAt: iso(row.completedAt),
        canceledAt: iso(row.canceledAt),
        lastActivityAt: row.lastActivityAt.toISOString(),
      },
      can,
    };
  });
}
