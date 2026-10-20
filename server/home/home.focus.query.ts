/**
 * "My Focus": my open tasks (`todo`, `in_progress`) most urgent first, plus the tasks waiting for my
 * review. Visibility is the Tugas menu's own (`visibleTo`), so a task listed here is one the Tugas page
 * lists too. The totals ride along as window counts, so the page needs no second query to say
 * "Lihat semua tugas (9)" or to write the briefing. Statements: the focus rows, the review rows
 * (parallel), then the viewer's memberships of the projects on screen, which decide the row button.
 */
import { and, asc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { projectListScope } from '../access/project.policy';
import { canApproveTask } from '../access/review.policy';
import { canCompleteTask, canStartTask } from '../access/task-flow.policy';
import type { Membership, Principal, TaskSubject } from '../access/types';
import { db } from '../db';
import { project, task } from '../db/schema';
import { diffDays } from '../metrics/dates';
import { type ScheduleGroup, scheduleGroupOf } from '../metrics/schedule';
import type { IsoDate } from '../metrics/types';
import type { TaskStatus } from '../pm/enums';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { liveTask, SORTS, visibleTo } from '../task/task.sql';
import { HOME_FOCUS_MAX, HOME_REVIEW_MAX } from './home.config';
import type { HomeFocus, HomeFocusTask, HomeReviewTask } from './home.dto';

/** Statuses a task can be worked on in; `in_review` waits for someone else. */
const WORKABLE: readonly TaskStatus[] = ['todo', 'in_progress'];

const columns = {
  id: task.id,
  number: task.number,
  title: task.title,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate,
  projectId: task.projectId,
  projectName: project.name,
  createdBy: task.createdBy,
  assigneeId: task.assigneeId,
  reviewerId: task.reviewerId,
  needsReview: task.needsReview,
};

type Row = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  createdBy: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
  needsReview: boolean;
};

const subjectOf = (r: Row): TaskSubject => ({
  id: r.id,
  projectId: r.projectId,
  status: r.status,
  createdBy: r.createdBy,
  assigneeId: r.assigneeId,
  reviewerId: r.reviewerId,
  needsReview: r.needsReview,
  deletedAt: null,
  deletedBy: null,
  projectDeletedAt: null,
});

const count = (filter?: SQL) =>
  filter
    ? sql<number>`(count(*) FILTER (WHERE ${filter}) OVER ())::int`
    : sql<number>`(count(*) OVER ())::int`;

/** The button of a focus row: finishing when allowed, else starting, else none (the title still opens the task). */
function actionOf(p: Principal, r: Row, m: Membership): HomeFocusTask['action'] {
  const s = subjectOf(r);
  if (canCompleteTask(p, s, m).ok) return 'complete';
  return canStartTask(p, s, m).ok ? 'start' : null;
}

export async function getFocus(
  p: Principal,
  clock: { today: IsoDate },
  exec: Executor = db,
): Promise<HomeFocus> {
  const date = (d: IsoDate) => sql`${d}::date`;
  const visible = visibleTo(projectListScope(p));
  const [focusRows, reviewRows] = await Promise.all([
    exec
      .select({
        ...columns,
        total: count(),
        overdueTotal: count(sql`${task.dueDate} < ${date(clock.today)}`),
        todayTotal: count(sql`${task.dueDate} = ${date(clock.today)}`),
      })
      .from(task)
      .innerJoin(project, eq(project.id, task.projectId))
      .where(and(liveTask, visible, eq(task.assigneeId, p.id), inArray(task.status, [...WORKABLE])))
      // Most urgent first: earliest due date (none last), then the highest priority, then id for a total order.
      .orderBy(sql`${SORTS.due.expr} ASC NULLS LAST`, sql`${SORTS.priority.expr} ASC`, asc(task.id))
      .limit(HOME_FOCUS_MAX),
    exec
      .select({ ...columns, total: count() })
      .from(task)
      .innerJoin(project, eq(project.id, task.projectId))
      .where(and(liveTask, visible, eq(task.reviewerId, p.id), eq(task.status, 'in_review')))
      .orderBy(asc(task.dueDate), asc(task.id))
      .limit(HOME_REVIEW_MAX),
  ]);
  const memberships = await loadMembership(
    p.id,
    [...focusRows.map((r) => r.projectId), ...reviewRows.map((r) => r.projectId)],
    exec,
  );

  const items = focusRows.map((r): HomeFocusTask => {
    const group = scheduleGroupOf(
      { status: r.status, deletedAt: null, dueDate: r.dueDate },
      clock.today,
    );
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      project: { id: r.projectId, name: r.projectName },
      dueDate: r.dueDate,
      group: (group ?? 'none') as ScheduleGroup,
      overdueDays: group === 'overdue' && r.dueDate ? diffDays(r.dueDate, clock.today) : null,
      priority: r.priority,
      action: actionOf(p, r, memberships.get(r.projectId) ?? null),
    };
  });
  const awaitingReview = reviewRows
    .filter((r) => canApproveTask(p, subjectOf(r), memberships.get(r.projectId) ?? null).ok)
    .map(
      (r): HomeReviewTask => ({
        id: r.id,
        number: r.number,
        title: r.title,
        project: { id: r.projectId, name: r.projectName },
      }),
    );
  return {
    items,
    total: focusRows[0]?.total ?? 0,
    overdueTotal: focusRows[0]?.overdueTotal ?? 0,
    todayTotal: focusRows[0]?.todayTotal ?? 0,
    awaitingReview,
    // The SQL total counts every task I am named reviewer on; it stands only while the policy accepts all of the rows read.
    awaitingReviewTotal:
      awaitingReview.length === reviewRows.length
        ? (reviewRows[0]?.total ?? 0)
        : awaitingReview.length,
  };
}
