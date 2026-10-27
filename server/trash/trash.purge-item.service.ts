/**
 * Permanent delete of one Trash item (S6 Z-04, P8 §5): the manual twin of the 30-day retention
 * sweep in `trash.purge.ts`. Irreversible, so the route calls `canPurge` — the same decision the
 * item's `can.purge` capability already reports — *before* this service opens a transaction.
 * There is no second permission rule here: an Admin or Super-admin sees every Trash item
 * (`trashListScope` → `all`), so "whose item is it" cannot change the answer, and whoever is
 * refused never reaches this file.
 *
 * Each kind runs in one `inTx` that locks its row FOR UPDATE first, so a concurrent restore or a
 * second purge of the same item reads the fresh state instead of interleaving: the loser of a race
 * between two Admins gets `NOT_FOUND`, and an item restored in the meantime gets `NOT_IN_TRASH`.
 *
 * Delete order is what keeps the foreign keys honest, and it is the sweep's order on purpose:
 * a project's trashed events go first, because `event.project_id` is SET NULL and deleting the
 * project alone would leave them behind as orphan personal events. The project row then cascades
 * to its tasks, comments, checklists, activity, members, plan, history and Inbox cards. A task or
 * an event trashed on its own cascades to its own children, but its Inbox cards have no foreign
 * key to cascade through, so `clearItemCards` removes them (see `trash.refs.ts`).
 *
 * Nothing here touches storage: tasks, events and projects own no files (no attachment table).
 */
import { and, count, eq, isNotNull, or } from 'drizzle-orm';
import { canPurge } from '../access/trash.policy';
import type { Principal } from '../access/types';
import { event, project, task } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import type { TrashPurgeResult } from './trash.purge';
import { clearItemCards } from './trash.refs';

/** The Trash kinds a permanent delete accepts; the same three the Trash list shows. */
export const PURGE_KINDS = ['project', 'task', 'event'] as const;
export type PurgeKind = (typeof PURGE_KINDS)[number];

/**
 * What went for good. `purged` counts rows per kind and includes the item itself, so it reads the
 * same way as one run of the retention sweep.
 */
export type PurgedItem = { kind: PurgeKind; id: string; purged: TrashPurgeResult };

export type PurgeItemResult = { ok: true; value: PurgedItem } | { ok: false; code: PmCode };

const refused = (code: PmCode): PurgeItemResult => ({ ok: false, code });
const NOTHING: TrashPurgeResult = { projects: 0, tasks: 0, events: 0 };

/** A trashed project with everything that hangs on it. */
async function purgeProject(tx: Tx, id: string): Promise<PurgeItemResult> {
  const [row] = await tx
    .select({ id: project.id, deletedAt: project.deletedAt })
    .from(project)
    .where(eq(project.id, id))
    // Serialises this purge against a restore and against a second purge of the same project.
    .for('update');
  if (!row) return refused('NOT_FOUND');
  if (!row.deletedAt) return refused('NOT_IN_TRASH');
  const [tasks] = await tx.select({ n: count() }).from(task).where(eq(task.projectId, id));
  // Before the project row, as in the sweep: `project_id` is SET NULL, so the other order would
  // strand these events as personal ones. Covers both the events that went with the project and
  // any that were trashed on their own earlier.
  const events = await tx
    .delete(event)
    .where(
      and(
        isNotNull(event.deletedAt),
        or(eq(event.deletedWithProjectId, id), eq(event.projectId, id)),
      ),
    )
    .returning({ id: event.id });
  // No `clearItemCards` here: every card about this project, its tasks and its events carries
  // `notification.project_id`, which CASCADEs with the row below.
  await tx.delete(project).where(eq(project.id, id));
  return {
    ok: true,
    value: {
      kind: 'project',
      id,
      purged: { projects: 1, tasks: tasks?.n ?? 0, events: events.length },
    },
  };
}

/**
 * One trashed task or event that stands as a Trash row of its own. An item that went with its
 * project (`deleted_with_project_id`) is not such a row — the project row stands for it, and the
 * Trash list leaves it out — so it answers `NOT_FOUND` rather than being deleted out from under
 * the project it would come back with.
 */
async function purgeOwn(tx: Tx, kind: 'task' | 'event', id: string): Promise<PurgeItemResult> {
  const table = kind === 'task' ? task : event;
  const [row] = await tx
    .select({ deletedAt: table.deletedAt, withProject: table.deletedWithProjectId })
    .from(table)
    .where(eq(table.id, id))
    .for('update');
  if (!row) return refused('NOT_FOUND');
  if (!row.deletedAt) return refused('NOT_IN_TRASH');
  if (row.withProject) return refused('NOT_FOUND');
  // Before the row: the cards point at it by free text, so no cascade would ever reach them.
  await clearItemCards(tx, kind, [id]);
  await tx.delete(table).where(eq(table.id, id));
  const purged: TrashPurgeResult = { ...NOTHING, [kind === 'task' ? 'tasks' : 'events']: 1 };
  return { ok: true, value: { kind, id, purged } };
}

/**
 * Deletes one Trash item for good. `canPurge` runs first and outside the transaction, so a caller
 * who may not purge is refused without taking a row lock; it is also what blocks a super-admin who
 * is impersonating somebody (`IMPERSONATING`), like every other destructive action.
 */
export async function purgeItem(
  p: Principal,
  kind: PurgeKind,
  id: string,
): Promise<PurgeItemResult> {
  const decision = canPurge(p);
  if (!decision.ok) return refused(decision.code);
  return inTx((tx) => (kind === 'project' ? purgeProject(tx, id) : purgeOwn(tx, kind, id)));
}
