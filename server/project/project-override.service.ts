/**
 * The manual project condition (S5a-03, L5-04): a manager overrides the computed condition with a
 * reason, optionally until a time. Same locking and recording rules as the deadline service.
 */
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { projectConditionOverride } from '../db/schema';
import type { ProjectCondition } from '../pm/enums';
import type { Tx } from '../pm/tx';
import { OVERRIDE_REASON_MAX } from './project.limits';
import { logActivity } from './project.service';
import {
  checkReason,
  type DeadlineResult,
  invalid,
  managed,
  nameOf,
  refuse,
} from './project-deadline.guard';
import { type ConditionOverrideDto, toConditionOverrideDto } from './project-plan.dto';

export type OverrideInput = {
  condition: ProjectCondition;
  reason: string;
  /** ISO instant in the future, or empty for "until cleared by hand". */
  expiresAt?: string | null;
};

const BAD_EXPIRY = 'Batas waktu harus tanggal dan jam di masa depan. Pilih waktu yang lebih akhir.';

/** Rows still in force: not cleared by hand and not yet expired. */
const inForce = (now: Date) =>
  and(
    isNull(projectConditionOverride.clearedAt),
    or(isNull(projectConditionOverride.expiresAt), gt(projectConditionOverride.expiresAt, now)),
  );

/** Marks the project's in-force overrides as cleared at `now`; returns how many rows changed. */
async function clearInForce(tx: Tx, projectId: string, now: Date): Promise<number> {
  const rows = await tx
    .update(projectConditionOverride)
    .set({ clearedAt: now })
    .where(and(eq(projectConditionOverride.projectId, projectId), inForce(now)))
    .returning({ id: projectConditionOverride.id });
  return rows.length;
}

/**
 * Sets a manual condition on an `active` project. A new one replaces the one in force (that row is
 * marked cleared, so exactly one is ever in force and "remove" can never bring an old one back).
 */
export function setConditionOverride(
  p: Principal,
  projectId: string,
  input: OverrideInput,
  now: Date = new Date(),
): Promise<DeadlineResult<ConditionOverrideDto>> {
  return managed(p, projectId, async (tx, row) => {
    const checked = checkReason(input.reason, OVERRIDE_REASON_MAX);
    if (!('reason' in checked)) return checked;
    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
        return invalid(BAD_EXPIRY);
      }
    }
    if (row.status !== 'active') return refuse('NOT_ACTIVE');

    await clearInForce(tx, row.id, now);
    const [created] = await tx
      .insert(projectConditionOverride)
      .values({
        projectId: row.id,
        condition: input.condition,
        reason: checked.reason,
        setBy: p.id,
        expiresAt,
        createdAt: now,
      })
      .returning();
    if (!created) throw new Error(`Condition override wrote no row for project ${row.id}`);
    await logActivity(tx, p, row.id, 'condition.overridden', { condition: input.condition });
    return {
      ok: true,
      value: toConditionOverrideDto({ ...created, setByName: await nameOf(tx, p.id) }),
    };
  });
}

/** Removes the manual condition in force; nothing in force is not an error (the call is idempotent). */
export function clearConditionOverride(
  p: Principal,
  projectId: string,
  now: Date = new Date(),
): Promise<DeadlineResult<{ cleared: number }>> {
  return managed(p, projectId, async (tx, row) => {
    const cleared = await clearInForce(tx, row.id, now);
    if (cleared > 0) await logActivity(tx, p, row.id, 'condition.override_cleared', {});
    return { ok: true, value: { cleared } };
  });
}
