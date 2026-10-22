/**
 * Shared pieces of the deadline and override writes (S5a-03): the result type with this slice's
 * codes, the lock-and-authorize wrapper and the reason check. No writes happen here.
 */
import { eq } from 'drizzle-orm';
import { canManageProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { user } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from './membership.query';
import { type LockedProject, lockProject, refused } from './project.service';
import { DEADLINE_ERRORS, type DeadlineCode } from './project-deadline.errors';

/** Like `WriteResult`, with the deadline codes this slice adds. */
export type DeadlineResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PmCode | DeadlineCode; error?: string };

export const invalid = (error: string): DeadlineResult<never> => ({
  ok: false,
  code: 'VALIDATION',
  error,
});

export const refuse = (code: DeadlineCode): DeadlineResult<never> => ({
  ok: false,
  code,
  error: DEADLINE_ERRORS[code],
});

const reasonTooLong = (max: number) =>
  `Alasan terlalu panjang (paling banyak ${max} huruf). Persingkat, lalu simpan lagi.`;

/** Reason text after trimming, or the failure to return: empty is `REASON_REQUIRED`, too long a validation. */
export function checkReason(raw: string, max: number): { reason: string } | DeadlineResult<never> {
  const reason = raw.trim();
  if (!reason) return { ok: false, code: 'REASON_REQUIRED' };
  if (reason.length > max) return invalid(reasonTooLong(max));
  return { reason };
}

/** Locks the project and checks the caller may manage it; `run` writes in the same `tx`. */
export function managed<T>(
  p: Principal,
  projectId: string,
  run: (tx: Tx, row: LockedProject) => Promise<DeadlineResult<T>>,
): Promise<DeadlineResult<T>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const membership = (await loadMembership(p.id, [projectId], tx)).get(projectId) ?? null;
    const decision = canManageProject(p, row, membership);
    if (!decision.ok) return refused(decision);
    return run(tx, row);
  });
}

/** The caller's display name for the DTO of the row just written. */
export async function nameOf(tx: Tx, userId: string): Promise<string | null> {
  const [me] = await tx.select({ name: user.name }).from(user).where(eq(user.id, userId));
  return me?.name ?? null;
}
