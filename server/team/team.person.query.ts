/**
 * One person's detail (S6 M04, P7 §5): profile, shared projects and — only where D10 allows it —
 * open work. Split from `team.query.ts`, which keeps the list; both share `team.sql.ts` for what a
 * caller may see.
 */
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { loadScopeFor } from '../access/team.policy';
import type { Principal, ProjectRole } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import { leaveStatusFor } from '../leave/leave.status.query';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import { isAdminRole, normalizeRole } from '../permissions';
import { getMetrics } from '../pm/metrics-env';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { accountActive } from './account-active';
import type { GetPersonResult, TeamLoad, TeamProjectRef } from './team.dto';
import { loadPersonWork } from './team.load.query';

const today = (now: Date): IsoDate => isoDateIn(now, getMetrics().TIME_ZONE);

/**
 * One person's profile, the projects they share with the caller, and their open work when D10
 * allows it. Four statements at most (the last one is the leave status). A person the caller shares no project with answers
 * `NOT_FOUND`, never 403: the caller may not learn that the account exists (D8).
 */
export async function getPerson(
  p: Principal,
  userId: string,
  now: Date,
  exec: Executor = db,
): Promise<GetPersonResult> {
  const admin = isAdminRole(p.appRole);
  const self = userId === p.id;
  const [person] = await exec
    .select({
      id: user.id,
      name: displayNameSql,
      email: user.email,
      role: user.role,
      jobTitle: profile.jobTitle,
      department: profile.department,
      phone: profile.phone,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    // An Admin may open a held or banned account; to everyone else it does not exist (M04).
    .where(and(eq(user.id, userId), admin ? undefined : accountActive))
    .limit(1);
  if (!person) return { ok: false, code: 'NOT_FOUND' };

  const shared = await sharedProjects(p, userId, admin, exec);
  if (!admin && !self && shared.projects.length === 0) return { ok: false, code: 'NOT_FOUND' };
  const scope = loadScopeFor(
    p,
    userId,
    shared.myRoles,
    shared.projects.map((x) => x.id),
  );
  const work = 'none' in scope ? null : await loadPersonWork(userId, scope, today(now), exec);
  const load: TeamLoad | undefined = work?.load;
  const leave = await leaveStatusFor([userId], today(now), exec);
  return {
    // Stored role, read as the user directory reads it; only an Admin is told (absent, not null).
    ...(admin ? { accountRole: normalizeRole(person.role) } : {}),
    person: {
      id: person.id,
      name: person.name,
      email: person.email,
      jobTitle: person.jobTitle ?? null,
      department: person.department ?? null,
      // Phone is the one field a colleague never gets, not even a manager (Q8).
      ...(self || admin ? { phone: person.phone ?? undefined } : {}),
    },
    projects: shared.projects,
    availability: leave.get(userId) ?? null,
    tasksVisible: work !== null,
    ...(work ? { tasks: work.tasks } : {}),
    ...(load ? { load } : {}),
    ...(load?.alsoElsewhere ? { alsoElsewhere: true as const } : {}),
  };
}

/** The target's live projects the caller may see, plus the caller's own role in each (one statement). */
async function sharedProjects(
  p: Principal,
  userId: string,
  admin: boolean,
  exec: Executor,
): Promise<{ projects: TeamProjectRef[]; myRoles: Map<string, ProjectRole> }> {
  const theirs = alias(projectMember, 'theirs');
  const mine = alias(projectMember, 'mine');
  const rows = await exec
    .select({ id: project.id, name: project.name, role: theirs.role, myRole: mine.role })
    .from(project)
    .innerJoin(theirs, and(eq(theirs.projectId, project.id), eq(theirs.userId, userId)))
    .leftJoin(mine, and(eq(mine.projectId, project.id), eq(mine.userId, p.id)))
    .where(and(isLive(project), admin ? undefined : isNotNull(mine.userId)))
    .orderBy(asc(project.name), asc(project.id));
  const myRoles = new Map<string, ProjectRole>();
  for (const r of rows) if (r.myRole) myRoles.set(r.id, r.myRole);
  return { projects: rows.map((r) => ({ id: r.id, name: r.name, role: r.role })), myRoles };
}
