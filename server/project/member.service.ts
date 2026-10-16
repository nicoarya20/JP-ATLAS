/**
 * Project member writes (S1-04): add, change role and remove. Each one runs in one `inTx` that
 * first locks the project row FOR UPDATE, so two changes to the same project run one after the
 * other and the "last manager" guard always sees the other's result. There is no "leave" route:
 * members cannot leave a project by themselves (`MEMBER_CAN_LEAVE_PROJECT=false`, D3).
 * No `audit()`: like other project changes these are recorded in `project_activity`.
 */
import { and, eq } from 'drizzle-orm';
import { canChangeManagerSet } from '../access/members.policy';
import { ACCESS_RULES, type AccessRules } from '../access/rules';
import type { Membership, Principal, ProjectRole } from '../access/types';
import { isBanActive } from '../ban';
import { projectMember, user } from '../db/schema';
import { inTx, type Tx } from '../pm/tx';
import {
  type LockedProject,
  lockProject,
  logActivity,
  refused,
  type WriteResult,
} from './project.service';

// User-facing Indonesian; each one says what to do next ("Pengelola utama" is the Lead, P3 §1).
export const MEMBER_WRITE_MESSAGES = {
  ALREADY_MEMBER: 'Orang ini sudah menjadi anggota proyek. Ubah perannya saja bila perlu.',
  BAD_CANDIDATE:
    'Orang ini belum disetujui, sedang diblokir, atau tidak ditemukan. Pilih orang lain.',
  LAST_MANAGER:
    'Proyek harus punya minimal satu pengelola. Tambahkan pengelola lain, lalu Jadikan Pengelola utama lain.',
  IS_LEAD: 'Dia masih Pengelola utama. Jadikan Pengelola utama lain dulu, lalu ubah perannya lagi.',
  NO_SELF_LEAVE:
    'Kamu tidak bisa mengeluarkan dirimu sendiri. Minta pengelola lain untuk melakukannya.',
} as const;

/** The target of a successful change and their role afterwards (null once removed). */
export type MemberChange = { userId: string; role: ProjectRole | null };

type MemberRow = { userId: string; role: ProjectRole; joinedAt: Date };

type Locked = {
  tx: Tx;
  row: LockedProject;
  /** Role of the change's target before it, or null when they are not a member. */
  targetRole: ProjectRole | null;
};

/** The primary-key match of one membership row. */
const memberKey = (projectId: string, userId: string) =>
  and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId));

const invalid = (error: string): WriteResult<never> => ({ ok: false, code: 'VALIDATION', error });

/**
 * Locks the project, loads its members (the caller's own membership among them, one query) and
 * runs `canChangeManagerSet` for `targetId` moving to `nextRole`; `run` writes in the same `tx`.
 */
function changeSet<T>(
  p: Principal,
  projectId: string,
  targetId: string,
  nextRole: ProjectRole | null,
  run: (ctx: Locked) => Promise<WriteResult<T>>,
): Promise<WriteResult<T>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const members: MemberRow[] = await tx
      .select({
        userId: projectMember.userId,
        role: projectMember.role,
        joinedAt: projectMember.createdAt,
      })
      .from(projectMember)
      .where(eq(projectMember.projectId, projectId));
    const own = members.find((m) => m.userId === p.id);
    const mine: Membership = own ? { role: own.role, joinedAt: own.joinedAt } : null;
    const targetRole = members.find((m) => m.userId === targetId)?.role ?? null;
    const managerIds = members.filter((m) => m.role === 'manager').map((m) => m.userId);
    const decision = canChangeManagerSet(p, row, mine, {
      targetId,
      targetRole,
      nextRole,
      managerIds,
    });
    if (!decision.ok) {
      const r = refused(decision);
      if (r.ok || (r.code !== 'LAST_MANAGER' && r.code !== 'IS_LEAD')) return r;
      return { ...r, error: MEMBER_WRITE_MESSAGES[r.code] };
    }
    return run({ tx, row, targetRole });
  });
}

/** Adds an approved, unbanned account to the project with `role`; an existing member is a 422. */
export function addMember(
  p: Principal,
  projectId: string,
  input: { userId: string; role: ProjectRole },
  now: Date = new Date(),
): Promise<WriteResult<MemberChange>> {
  return changeSet(p, projectId, input.userId, input.role, async ({ tx, row, targetRole }) => {
    if (targetRole) return invalid(MEMBER_WRITE_MESSAGES.ALREADY_MEMBER);
    const [candidate] = await tx
      .select({
        approvalStatus: user.approvalStatus,
        banned: user.banned,
        banExpires: user.banExpires,
      })
      .from(user)
      .where(eq(user.id, input.userId));
    if (candidate?.approvalStatus !== 'approved' || isBanActive(candidate, now.getTime())) {
      return invalid(MEMBER_WRITE_MESSAGES.BAD_CANDIDATE);
    }
    await tx
      .insert(projectMember)
      .values({ projectId: row.id, userId: input.userId, role: input.role, addedBy: p.id });
    await logActivity(tx, p, row.id, 'member_added', { userId: input.userId, role: input.role });
    return { ok: true, value: { userId: input.userId, role: input.role } };
  });
}

/** Changes a member's role; the last manager and the Lead cannot be moved off `manager` (409). */
export function changeMemberRole(
  p: Principal,
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<WriteResult<MemberChange>> {
  // Q9: changing roles is blocked while a super-admin acts as someone else.
  if (p.impersonating) return Promise.resolve({ ok: false, code: 'IMPERSONATING' });
  return changeSet(p, projectId, userId, role, async ({ tx, row, targetRole }) => {
    if (!targetRole) return { ok: false, code: 'NOT_FOUND' };
    if (targetRole === role) return { ok: true, value: { userId, role } };
    await tx.update(projectMember).set({ role }).where(memberKey(row.id, userId));
    await logActivity(tx, p, row.id, 'member_role_changed', { userId, from: targetRole, to: role });
    return { ok: true, value: { userId, role } };
  });
}

/**
 * Removes a member; the last manager and the Lead stay (409). Removing yourself is leaving,
 * which `MEMBER_CAN_LEAVE_PROJECT` forbids, so it is refused even for a manager.
 */
export function removeMember(
  p: Principal,
  projectId: string,
  userId: string,
  rules: AccessRules = ACCESS_RULES,
): Promise<WriteResult<MemberChange>> {
  // Q9: removing people is destructive, so it is blocked while impersonating.
  if (p.impersonating) return Promise.resolve({ ok: false, code: 'IMPERSONATING' });
  return changeSet(p, projectId, userId, null, async ({ tx, row, targetRole }) => {
    if (!targetRole) return { ok: false, code: 'NOT_FOUND' };
    if (userId === p.id && !rules.MEMBER_CAN_LEAVE_PROJECT) {
      return { ok: false, code: 'SELF_TARGET', error: MEMBER_WRITE_MESSAGES.NO_SELF_LEAVE };
    }
    await tx.delete(projectMember).where(memberKey(row.id, userId));
    await logActivity(tx, p, row.id, 'member_removed', { userId, role: targetRole });
    return { ok: true, value: { userId, role: null } };
  });
}
