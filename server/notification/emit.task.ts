/**
 * The Inbox cards the Tugas module sends (S3 I05-I06, P5 §5.5). The service that changed the task
 * calls these inside its own `tx`, right after it wrote the `task_activity` row, and hands that
 * row over: its id is the event identity `notify()` deduplicates on (`sub`), so two changes to one
 * task leave two cards while one change reported twice leaves one.
 *
 * Nothing here throws and nothing here decides who may be told: `notify()` filters the recipients
 * and swallows its own failures in a savepoint, so a card that cannot be written never takes the
 * task write down with it. Controllers never import this file (P5 §5.3 butir 4) — the hooks sit in
 * the service, which is what makes a card close whatever the caller used: a session, an API key or,
 * later, an MCP tool.
 */
import { eq } from 'drizzle-orm';
import { project, task } from '../db/schema';
import type { Executor } from '../pm/tx';
import { type EnabledTaskAction, TASK_ACTIVITY } from '../task/task.limits';
import { kindsByLane } from './notification.catalog';
import { notify } from './notification.notify';
import { followersOf } from './notification.recipients';
import { resolveNotifications } from './notification.resolve';
import type { ResolveReason, TaskCardPayload } from './notification.types';

/** A `task_activity` row the caller has just written; only its identity and its kind matter here. */
export type ActivityRow = { id: string; action: string };

/** What every task hook carries: the task, who acted, and the activity rows of that same write. */
export type TaskEmit = {
  /** Who made the change; `notify()` keeps them out of their own Inbox. */
  by: string;
  /** The `task_activity` rows written in the same transaction, in the order they were inserted. */
  acts?: readonly ActivityRow[];
  /** Event time; defaults to now. A service passes its request clock so a bundle window is stable. */
  at?: Date;
};

const taskRef = (id: string) => ({ type: 'task', id }) as const;

/** The card's snapshot plus the people a task card may reach. */
type Snapshot = Required<Pick<TaskCardPayload, 'title' | 'number' | 'projectName'>> & {
  projectId: string;
  createdBy: string | null;
  assigneeId: string | null;
};

/** One query for both: what the card stores and who it may go to. */
async function snapshotOf(exec: Executor, taskId: string): Promise<Snapshot | null> {
  const [row] = await exec
    .select({
      title: task.title,
      number: task.number,
      projectName: project.name,
      projectId: task.projectId,
      createdBy: task.createdBy,
      assigneeId: task.assigneeId,
    })
    .from(task)
    .innerJoin(project, eq(project.id, task.projectId))
    .where(eq(task.id, taskId));
  return row ?? null;
}

/** What the card stores: a snapshot taken now, never a live join (`notify()` cuts the lengths). */
const cardOf = (snap: Snapshot): TaskCardPayload => ({
  title: snap.title,
  number: snap.number,
  projectName: snap.projectName,
});

/** The row that names an assignment event: the reassignment row, else the one `createTask` wrote. */
const assignSub = (acts: TaskEmit['acts']) =>
  (acts?.find((a) => a.action === TASK_ACTIVITY.assigneeChanged) ?? acts?.[0])?.id;

/**
 * Assignment, at create and on every reassignment: whoever is now meant to work on the task gets
 * the single `action` card S3 sends. `was` is the previous assignee — when there was one, their
 * card is handed over to `emitTaskUnassigned` first. Called with an unchanged assignee it does
 * nothing, so `updateTask` may call it for every edit without asking what changed.
 */
export async function emitTaskAssigned(
  exec: Executor,
  id: string,
  i: TaskEmit & { was?: string | null },
): Promise<void> {
  // An edit that left the assignee alone writes no `assignee_changed` row, so it needs no lookup.
  const reassigned = i.acts?.some((a) => a.action === TASK_ACTIVITY.assigneeChanged);
  if (i.was !== undefined && !reassigned) return;
  const snap = await snapshotOf(exec, id);
  const was = i.was ?? null;
  if (!snap || snap.assigneeId === was) return;
  if (was) await emitTaskUnassigned(exec, id, { ...i, was });
  if (!snap.assigneeId) return;
  await notify(exec, {
    kind: 'task_assigned',
    recipients: [snap.assigneeId],
    actorId: i.by,
    projectId: snap.projectId,
    ref: taskRef(id),
    sub: assignSub(i.acts),
    payload: cardOf(snap),
    at: i.at,
  });
}

/**
 * The person who no longer works on the task: their open card leaves "Perlu Anda tanggapi" as
 * `superseded` (the work moved, they did not do it) and they are told once, as news. It takes its
 * own snapshot, which costs one primary-key read on a path only a reassignment reaches.
 */
export async function emitTaskUnassigned(
  exec: Executor,
  id: string,
  i: TaskEmit & { was: string },
): Promise<void> {
  const snap = await snapshotOf(exec, id);
  if (!snap) return;
  await resolveNotifications(exec, {
    ref: taskRef(id),
    kinds: ['task_assigned'],
    recipientId: i.was,
    reason: 'superseded',
    at: i.at,
  });
  await notify(exec, {
    kind: 'task_unassigned',
    recipients: [i.was],
    actorId: i.by,
    projectId: snap.projectId,
    ref: taskRef(id),
    sub: assignSub(i.acts),
    payload: cardOf(snap),
    at: i.at,
  });
}

/**
 * Steps that take a status back instead of moving it on. All four are news for the followers:
 * leaving one of them silent would put a hole in "Kabar terbaru" that cannot be explained to a
 * user (18 Okt 2026 decision; P5 §5.5 lists the row for the other three).
 */
const REVERSALS = new Set<EnabledTaskAction>(['cancel', 'reopen', 'uncancel', 'unstart']);

/** The "Perlu Anda tanggapi" card has been answered: the work was taken up or finished. */
const closeAssigned = (exec: Executor, id: string, i: TaskEmit, reason: ResolveReason) =>
  resolveNotifications(exec, { ref: taskRef(id), kinds: ['task_assigned'], reason, at: i.at });

/**
 * The task is finished: its open card is answered and the two people who were waiting for it —
 * whoever created it and whoever was meant to do it — are told, whoever pressed the button. The
 * card closes for the assignee even when somebody else completed the task, which is the point of
 * resolving by ref rather than by recipient.
 */
export async function emitTaskDone(exec: Executor, id: string, i: TaskEmit): Promise<void> {
  const snap = await snapshotOf(exec, id);
  if (!snap) return;
  await closeAssigned(exec, id, i, 'acted');
  await notify(exec, {
    kind: 'task_done',
    recipients: [snap.createdBy, snap.assigneeId].filter((who): who is string => who !== null),
    actorId: i.by,
    projectId: snap.projectId,
    ref: taskRef(id),
    // The step wrote one activity row, and that row is what makes this card its own event.
    sub: i.acts?.[0]?.id,
    payload: cardOf(snap),
    at: i.at,
  });
}

/**
 * A change that is only news for the people who follow the task. No `sub`, so repeats inside one
 * hour bundle into a single "3 perubahan di #12" line instead of three cards.
 */
export async function emitTaskChanged(exec: Executor, id: string, i: TaskEmit): Promise<void> {
  const snap = await snapshotOf(exec, id);
  if (!snap) return;
  await notify(exec, {
    kind: 'task_changed',
    recipients: await followersOf(exec, id),
    actorId: i.by,
    projectId: snap.projectId,
    ref: taskRef(id),
    payload: cardOf(snap),
    at: i.at,
  });
}

/**
 * One workflow step, after its activity row is written. `start` and `complete` answer the card
 * (the work was taken up, or it is done); `cancel` closes every open `action` card on the task,
 * because what the cards asked for cannot happen any more. Every reversal is reported as news,
 * because a status that is taken back is exactly what the followers of a task need to hear. None
 * of them writes a `task_assigned` card: the old card was answered, and a task asks again only
 * when someone is put on it.
 */
export async function emitTaskTransition(
  exec: Executor,
  id: string,
  i: TaskEmit & { action: EnabledTaskAction },
): Promise<void> {
  if (i.action === 'complete') return emitTaskDone(exec, id, i);
  if (i.action === 'start') {
    await closeAssigned(exec, id, i, 'acted');
    return;
  }
  if (i.action === 'cancel') {
    await resolveNotifications(exec, {
      ref: taskRef(id),
      kinds: kindsByLane('action'),
      reason: 'target_closed',
      at: i.at,
    });
  }
  if (REVERSALS.has(i.action)) {
    await emitTaskChanged(exec, id, i);
  }
}

/**
 * A new comment, bundled per hour into "5 komentar baru di #12" for the task's followers. The
 * excerpt is the comment as typed; `notify()` cuts it to `PAYLOAD_EXCERPT_MAX` and no log line
 * ever carries it.
 */
export async function emitTaskCommented(
  exec: Executor,
  id: string,
  i: TaskEmit & { excerpt?: string },
): Promise<void> {
  const snap = await snapshotOf(exec, id);
  if (!snap) return;
  await notify(exec, {
    kind: 'task_commented',
    recipients: await followersOf(exec, id),
    actorId: i.by,
    projectId: snap.projectId,
    ref: taskRef(id),
    payload: { ...cardOf(snap), ...(i.excerpt ? { excerpt: i.excerpt } : {}) },
    at: i.at,
  });
}
