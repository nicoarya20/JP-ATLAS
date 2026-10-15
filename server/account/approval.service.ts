/**
 * Account approval (S0A-10): `approveUser` / `rejectUser` move a user between approval statuses.
 * The policy decides who may; the write is one `UPDATE … WHERE approval_status = $from` so of two
 * simultaneous decisions exactly one wins and the other reports `WRONG_STATE`.
 */
import { and, eq, sql } from 'drizzle-orm';
import { canTransitionAccount } from '../access/account-status.rules';
import type { DenyCode } from '../access/decision';
import { canSetUserRole, type Principal } from '../access/user.policy';
import { AUDIT_ACTIONS, audit } from '../audit';
import { db } from '../db';
import { user } from '../db/schema';
import { normalizeRole, type Role } from '../permissions';
import type { ApprovalStatus } from '../pm/enums';
import { maskEmail } from './mask-email';

export type ApprovalInput = {
  actor: Principal;
  /** Actor's own email, stored masked in the audit entry. */
  actorEmail?: string | null;
  targetId: string;
  /** Request headers, for the audit entry's IP / user agent. */
  headers?: Headers | null;
};

export type ApproveInput = ApprovalInput & {
  /** Role to grant on approval; omitted keeps the role the account already has. */
  role?: Role;
};

export type RejectInput = ApprovalInput & {
  /** Shown to the rejected user; the rules require 3-200 characters once trimmed. */
  reason?: string | null;
};

export type ApprovalResult =
  | { ok: true; user: { id: string; name: string; approvalStatus: ApprovalStatus; role: Role } }
  | { ok: false; code: DenyCode | 'NOT_FOUND' };

type Subject = {
  id: string;
  name: string;
  email: string;
  rawRole: string | null;
  appRole: Role;
  approvalStatus: ApprovalStatus;
};

async function loadSubject(id: string): Promise<Subject | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rawRole: row.role,
    appRole: normalizeRole(row.role),
    approvalStatus: row.approvalStatus as ApprovalStatus,
  };
}

/**
 * Atomic status move. Besides the expected `from` status it pins the role that the policy
 * check saw, so a concurrent role change cannot slip an Admin past target protection.
 */
async function applyDecision(
  s: Subject,
  to: ApprovalStatus,
  actorId: string,
  patch: { role?: Role; reason: string | null },
) {
  const [row] = await db
    .update(user)
    .set({
      approvalStatus: to,
      approvalDecidedBy: actorId,
      approvalDecidedAt: sql`now()`,
      approvalReason: patch.reason,
      ...(patch.role ? { role: patch.role } : {}),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(user.id, s.id),
        eq(user.approvalStatus, s.approvalStatus),
        sql`${user.role} IS NOT DISTINCT FROM ${s.rawRole}`,
      ),
    )
    .returning({ id: user.id, role: user.role, approvalStatus: user.approvalStatus });
  return row ?? null;
}

/** The audit actor with its email masked, like every other address in these entries. */
const auditActor = (i: ApprovalInput) => ({
  id: i.actor.id,
  email: i.actorEmail ? maskEmail(i.actorEmail) : null,
});

/** Approves a pending or rejected account, optionally setting its role; audited as `user.approve`. */
export async function approveUser(input: ApproveInput): Promise<ApprovalResult> {
  const s = await loadSubject(input.targetId);
  if (!s) return { ok: false, code: 'NOT_FOUND' };
  const target = { id: s.id, appRole: s.appRole };
  const decision = canTransitionAccount(s.approvalStatus, 'approved', {
    actor: input.actor,
    target,
  });
  if (!decision.ok) return { ok: false, code: decision.code };
  if (input.role) {
    const grant = canSetUserRole(input.actor, target, input.role);
    if (!grant.ok) return { ok: false, code: grant.code };
  }

  const row = await applyDecision(s, 'approved', input.actor.id, {
    role: input.role,
    reason: null,
  });
  if (!row) return { ok: false, code: 'WRONG_STATE' };

  const role = normalizeRole(row.role);
  void audit({
    actor: auditActor(input),
    headers: input.headers,
    action: AUDIT_ACTIONS.USER_APPROVE,
    targetType: 'user',
    targetId: s.id,
    summary: `Akun ${s.name} (${s.id}, ${maskEmail(s.email)}) disetujui sebagai ${role}`,
    meta: { from: s.approvalStatus, role, previousRole: s.appRole },
  });
  return { ok: true, user: { id: s.id, name: s.name, approvalStatus: 'approved', role } };
}

/** Rejects a pending account with a mandatory reason; audited as `user.reject`. */
export async function rejectUser(input: RejectInput): Promise<ApprovalResult> {
  const s = await loadSubject(input.targetId);
  if (!s) return { ok: false, code: 'NOT_FOUND' };
  const decision = canTransitionAccount(s.approvalStatus, 'rejected', {
    actor: input.actor,
    target: { id: s.id, appRole: s.appRole },
    reason: input.reason,
  });
  if (!decision.ok) return { ok: false, code: decision.code };

  const reason = (input.reason ?? '').trim();
  const row = await applyDecision(s, 'rejected', input.actor.id, { reason });
  if (!row) return { ok: false, code: 'WRONG_STATE' };

  void audit({
    actor: auditActor(input),
    headers: input.headers,
    action: AUDIT_ACTIONS.USER_REJECT,
    targetType: 'user',
    targetId: s.id,
    summary: `Akun ${s.name} (${s.id}, ${maskEmail(s.email)}) ditolak`,
    meta: { from: s.approvalStatus, reason },
  });
  return {
    ok: true,
    user: { id: s.id, name: s.name, approvalStatus: 'rejected', role: s.appRole },
  };
}
