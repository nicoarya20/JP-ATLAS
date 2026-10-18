/**
 * People picker (S1-04, KB-7): approved, unbanned accounts found by name, for the project form
 * (Lead and members) and the "+ Anggota" dialog. Only `{ id, name, jobTitle, image }` leaves
 * this file: never email or phone (Q8). The Team pages (S6) may reuse it without a clash.
 */
import { and, asc, eq, ilike, notExists, type SQL, sql } from 'drizzle-orm';
import { atLeast, levelOf } from '../access/level';
import { canCreateProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { loadMembership } from '../project/membership.query';
import { accountActive, likeText } from './account-active';

export const PICKER_LIMIT_DEFAULT = 20;
/** A picker shows a short list to choose from; asking for more is clamped to this. */
export const PICKER_LIMIT_MAX = 50;

/** One person in the picker; the only fields a picker may show (Q8). */
export type PickerPerson = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};

export type PickPeopleInput = {
  /** Part of the name to look for; empty or missing lists everyone. */
  q?: string;
  /** Without it only people who may create projects may search; with it, the people who could still join. */
  projectId?: string;
  limit?: number;
};

export type PickPeopleResult = { ok: true; items: PickerPerson[] } | { ok: false; code: PmCode };

/** Clamps `limit` to 1..PICKER_LIMIT_MAX; a missing or odd value gets the default. */
export function pickerLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return PICKER_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.floor(limit), 1), PICKER_LIMIT_MAX);
}

/** Why `p` may not search for `projectId`, or null when they may: a member of that project or an Admin. */
async function projectRefusal(
  p: Principal,
  projectId: string,
  exec: Executor,
): Promise<PmCode | null> {
  const [row] = await exec
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), isLive(project)))
    .limit(1);
  if (!row) return 'NOT_FOUND';
  const level = levelOf(p, (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null);
  if (!atLeast(level, 'reader')) return 'NOT_FOUND'; // hidden looks missing (D8)
  // A non-member Project Manager only reads the project (P-A1), so has nobody to pick for it.
  return atLeast(level, 'viewer') ? null : 'NOT_MEMBER';
}

/** Approved, unbanned people by name (A-Z), never more than `PICKER_LIMIT_MAX`; with `projectId`, its members are left out. */
export async function pickPeople(
  p: Principal,
  input: PickPeopleInput,
  exec: Executor = db,
): Promise<PickPeopleResult> {
  if (input.projectId === undefined) {
    const allowed = canCreateProject(p);
    if (!allowed.ok) return { ok: false, code: allowed.code };
  } else {
    const code = await projectRefusal(p, input.projectId, exec);
    if (code) return { ok: false, code };
  }
  const where: SQL[] = [accountActive];
  const q = input.q?.trim();
  if (q) where.push(ilike(user.name, likeText(q)));
  if (input.projectId !== undefined) {
    const already = exec
      .select({ one: sql`1` })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, input.projectId), eq(projectMember.userId, user.id)));
    where.push(notExists(already));
  }
  const items = await exec
    .select({ id: user.id, name: user.name, jobTitle: profile.jobTitle, image: user.image })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(and(...where))
    .orderBy(asc(user.name), asc(user.id))
    .limit(pickerLimit(input.limit));
  return { ok: true, items };
}
