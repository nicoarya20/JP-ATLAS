/** Per-viewer derivations of a task row (S2-02): the policy subject, its labels and its `can{}` map. */

import type { Caps, TaskCapKey } from '../access/capabilities';
import { taskCaps } from '../access/capabilities';
import type { ReviewerPool } from '../access/review.policy';
import { canApproveTask } from '../access/review.policy';
import type { PrimaryAction } from '../access/task-flow.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { taskLabels } from '../metrics/task.metrics';
import type { TaskLabel } from '../metrics/types';
import { getMetrics } from '../pm/metrics-env';
import type { PhaseRef, TaskCardRow, TaskClock } from './task.dto';

/** The slice of a live task the policies read; trashed rows never reach a read, so both trash stamps are null. */
export function subjectOf(row: TaskCardRow): TaskSubject {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    createdBy: row.createdBy,
    assigneeId: row.assigneeId,
    reviewerId: row.reviewerId,
    needsReview: row.needsReview,
    deletedAt: null,
    deletedBy: null,
    projectDeletedAt: null,
  };
}

/** The row's phase as the one `PhaseRef` shape the list and the detail both return (H-B5). */
export function phaseOf(row: Pick<TaskCardRow, 'phaseId' | 'phaseName'>): PhaseRef | null {
  return row.phaseId && row.phaseName ? { id: row.phaseId, name: row.phaseName } : null;
}

export type TaskView = {
  labels: TaskLabel[];
  can: Caps<TaskCapKey>;
  primary: PrimaryAction | null;
};

/** Labels and capabilities of `row` for `p`; the reviewer pool is the one loaded for the row's project. */
export function viewOf(
  p: Principal,
  row: TaskCardRow,
  m: Membership,
  pool: ReviewerPool,
  clock: TaskClock,
): TaskView {
  const subject = subjectOf(row);
  const { primary, ...can } = taskCaps(p, subject, m, pool);
  // The blocked label waits for dependencies (S4); "waiting for my review" is the task's own reviewer who may approve it.
  const awaitingMe = row.reviewerId === p.id && canApproveTask(p, subject, m).ok;
  const { all } = taskLabels(
    { ...row, deletedAt: null },
    { today: clock.today, now: clock.now, blocked: false, awaitingMe },
    clock.metrics ?? getMetrics(),
  );
  return { labels: all, can, primary };
}
