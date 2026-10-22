/**
 * Task checklist writes (S2-06): add, change (text, tick, position) and remove a step. Who may write
 * is `canEditTask` (a Member only on own tasks, T-A2), so another Member cannot tick someone's task.
 * Removing a step hard-deletes a small row of the task (not Trash). Every write bumps the task's
 * `last_activity_at`; logs carry ids only (C-LOG-1), never the step text.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import { canEditTask } from '../access/task.policy';
import type { Principal } from '../access/types';
import { taskChecklistItem } from '../db/schema';
import { logger } from '../logger';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import type { TaskClock } from './task.dto';
import {
  TASK_CHECKLIST_MAX_ITEMS,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_WRITE_MESSAGES,
} from './task.limits';
import { loadTaskAccess, touchTask } from './task-access.query';

export type ChecklistItem = { id: string; text: string; isDone: boolean; position: number };
export type Checklist = { done: number; total: number; items: ChecklistItem[] };

export type ChecklistResult =
  | { ok: true; item: ChecklistItem | null; checklist: Checklist }
  | { ok: false; code: PmCode; error?: string };

type Refusal = Extract<ChecklistResult, { ok: false }>;
const refused = (code: PmCode): Refusal => ({ ok: false, code });
const invalid = (error: string): Refusal => ({ ok: false, code: 'VALIDATION', error });

/** The trimmed step text, or the refusal for an empty or too long one. */
function cleanText(raw: string): string | Refusal {
  const text = raw.trim();
  if (!text) return invalid(TASK_WRITE_MESSAGES.emptyStep);
  return text.length > TASK_CHECKLIST_TEXT_MAX ? invalid(TASK_WRITE_MESSAGES.stepTooLong) : text;
}

/** The task's steps in display order, with the "2/3" progress the detail shows. */
async function readChecklist(tx: Tx, taskId: string): Promise<Checklist> {
  const items = await tx
    .select({
      id: taskChecklistItem.id,
      text: taskChecklistItem.text,
      isDone: taskChecklistItem.isDone,
      position: taskChecklistItem.position,
    })
    .from(taskChecklistItem)
    .where(eq(taskChecklistItem.taskId, taskId))
    .orderBy(asc(taskChecklistItem.position), asc(taskChecklistItem.id));
  return { done: items.filter((i) => i.isDone).length, total: items.length, items };
}

/**
 * Runs `write` on the task `ref` names when `p` may edit it, with the task row locked so counts and
 * positions cannot race. `write` answers the touched item id (null once removed) or a refusal; an
 * item id of another task is looked up inside this task only, so it answers `NOT_FOUND`.
 */
function onEditableTask(
  p: Principal,
  ref: string,
  clock: TaskClock,
  write: (tx: Tx, taskId: string, list: Checklist) => Promise<string | null | Refusal>,
): Promise<ChecklistResult> {
  return inTx(async (tx): Promise<ChecklistResult> => {
    const access = await loadTaskAccess(p, ref, tx, true);
    if (!access) return refused('NOT_FOUND');
    const decision = canEditTask(p, access.subject, access.m);
    if (!decision.ok) return refused(decision.code);
    const taskId = access.subject.id;
    const touched = await write(tx, taskId, await readChecklist(tx, taskId));
    if (touched !== null && typeof touched !== 'string') return touched;
    await touchTask(tx, taskId, clock.now);
    const checklist = await readChecklist(tx, taskId);
    return { ok: true, item: checklist.items.find((i) => i.id === touched) ?? null, checklist };
  });
}

/** Adds a step at the end of the list; refused past `TASK_CHECKLIST_MAX_ITEMS`. */
export function addChecklistItem(p: Principal, ref: string, rawText: string, clock: TaskClock) {
  return onEditableTask(p, ref, clock, async (tx, taskId, list) => {
    const text = cleanText(rawText);
    if (typeof text !== 'string') return text;
    if (list.total >= TASK_CHECKLIST_MAX_ITEMS) return invalid(TASK_WRITE_MESSAGES.tooManySteps);
    const position = Math.max(-1, ...list.items.map((i) => i.position)) + 1;
    const [row] = await tx.insert(taskChecklistItem).values({ taskId, text, position }).returning();
    if (!row) throw new Error(`Checklist insert on task ${taskId} returned no row`);
    logger.info({ taskId, itemId: row.id, actorId: p.id }, 'task checklist item added');
    return row.id;
  });
}

/** Changes a step's text, tick or place; `position` is the 0-based index it moves to (clamped). */
export function updateChecklistItem(
  p: Principal,
  ref: string,
  itemId: string,
  patch: { text?: string; isDone?: boolean; position?: number },
  clock: TaskClock,
) {
  return onEditableTask(p, ref, clock, async (tx, taskId, list) => {
    if (Object.keys(patch).length === 0) return invalid(TASK_WRITE_MESSAGES.nothingToChange);
    const index = list.items.findIndex((i) => i.id === itemId);
    const current = list.items[index];
    if (!current) return refused('NOT_FOUND');
    const text = patch.text === undefined ? current.text : cleanText(patch.text);
    if (typeof text !== 'string') return text;
    const flip = patch.isDone !== undefined && patch.isDone !== current.isDone;
    const tick = flip ? ticked(Boolean(patch.isDone), p.id, clock.now) : {};
    await tx
      .update(taskChecklistItem)
      .set({ text, ...tick })
      .where(and(eq(taskChecklistItem.id, itemId), eq(taskChecklistItem.taskId, taskId)));
    if (patch.position !== undefined) await reorder(tx, list.items, index, patch.position);
    logger.info({ taskId, itemId, actorId: p.id }, 'task checklist item changed');
    return itemId;
  });
}

/** Who ticked a step and when; unticking clears both. */
const ticked = (isDone: boolean, by: string, now: Date) =>
  isDone ? { isDone, doneBy: by, doneAt: now } : { isDone, doneBy: null, doneAt: null };

/** Moves the item at `from` to index `to`, then rewrites the positions that changed in one UPDATE. */
async function reorder(tx: Tx, items: ChecklistItem[], from: number, to: number) {
  const order = [...items];
  const [moved] = order.splice(from, 1);
  if (!moved) return;
  order.splice(Math.min(to, order.length), 0, moved);
  const changed = order.flatMap((item, pos) =>
    item.position === pos ? [] : [sql`(${item.id}, ${pos}::smallint)`],
  );
  if (changed.length === 0) return;
  await tx.execute(sql`UPDATE ${taskChecklistItem} SET position = v.pos
    FROM (VALUES ${sql.join(changed, sql`, `)}) AS v(id, pos) WHERE task_checklist_item.id = v.id`);
}

/** Removes a step for good (a small row of the task, not a Trash item; the UI confirms first, T2). */
export function removeChecklistItem(p: Principal, ref: string, itemId: string, clock: TaskClock) {
  return onEditableTask(p, ref, clock, async (tx, taskId) => {
    const [gone] = await tx
      .delete(taskChecklistItem)
      .where(and(eq(taskChecklistItem.id, itemId), eq(taskChecklistItem.taskId, taskId)))
      .returning({ id: taskChecklistItem.id });
    if (!gone) return refused('NOT_FOUND');
    logger.info({ taskId, itemId, actorId: p.id }, 'task checklist item removed');
    return null;
  });
}
