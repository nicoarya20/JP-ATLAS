/**
 * Team reads (S6 M02, P7 §5): who shares projects with the caller, their role in each, and — only
 * where D10 allows it — how much open work they carry.
 *
 * Four statements at most per list, whatever the page size: the caller's project context, the page
 * of people with its total, the page's project roles, and the load of the people who have a scope.
 * Visibility is decided in SQL and in `loadScopeFor`, so a response never carries a number the
 * caller may not see.
 */
import { and, asc, desc, eq, ilike, inArray, isNotNull, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { canSortByLoad, type LoadScope, loadScopeFor, scopeCovers } from '../access/team.policy';
import type { Principal, ProjectRole } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import { isAdminRole } from '../permissions';
import { getMetrics } from '../pm/metrics-env';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { accountActive, likeText } from './account-active';
import type {
  GetPersonResult,
  ListTeamInput,
  ListTeamResult,
  TeamLoad,
  TeamPerson,
  TeamProjectRef,
  TeamSummary,
} from './team.dto';
import { loadForPeople, loadPersonWork } from './team.load.query';
import { peopleVisibleTo, projectsVisibleTo, type TeamContext, teamContext } from './team.sql';

/** A team is small (P7 §5), so the page is short and paging is offset-based. */
export const TEAM_LIMIT_DEFAULT = 24;
export const TEAM_LIMIT_MAX = 50;
/** Longer search text is pointless and keeps the `LIKE` pattern bounded. */
export const TEAM_SEARCH_MAX = 100;

const clampLimit = (n: number | undefined) =>
  Math.min(Math.max(Math.trunc(n ?? TEAM_LIMIT_DEFAULT), 1), TEAM_LIMIT_MAX);
const clampOffset = (n: number | undefined) => Math.max(Math.trunc(n ?? 0), 0);
const today = (now: Date): IsoDate => isoDateIn(now, getMetrics().TIME_ZONE);

/** Project roles of everyone on the page, in one statement; non-members simply have no row. */
async function rolesOf(
  pageIds: readonly string[],
  visible: SQL | undefined,
  exec: Executor,
): Promise<Map<string, TeamProjectRef[]>> {
  const byUser = new Map<string, TeamProjectRef[]>();
  if (pageIds.length === 0) return byUser;
  const rows = await exec
    .select({
      userId: projectMember.userId,
      id: project.id,
      name: project.name,
      role: projectMember.role,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(inArray(projectMember.userId, [...pageIds]), isLive(project), visible))
    .orderBy(asc(project.name), asc(project.id));
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push({ id: r.id, name: r.name, role: r.role });
    byUser.set(r.userId, list);
  }
  return byUser;
}

/** Sums the page's visible load; absent keys mean "this caller sees nobody else's numbers" (D10). */
function summarize(ctx: TeamContext, total: number, people: readonly TeamPerson[]): TeamSummary {
  const loads = people.flatMap((x) => (x.load ? [x.load] : []));
  const summary: TeamSummary = { people: total, projects: ctx.visibleProjects };
  if (loads.length === 0) return summary;
  summary.active = loads.reduce((n, l) => n + l.active, 0);
  summary.overdue = loads.reduce((n, l) => n + l.overdue, 0);
  return summary;
}

/**
 * One page of the people the caller shares projects with, each with the projects they share and —
 * where D10 allows — their open-task counts.
 *
 * `sort=overdue` orders the page by `overdue desc, name`: the counts are only known after the page
 * is chosen, so the ordering applies within the page (P7 §5). A caller `canSortByLoad` rejects is
 * refused `SORT_NOT_ALLOWED` rather than quietly given the name order; deciding it here costs no
 * extra statement, since the caller's project roles are already loaded (the route maps the code).
 */
export async function listTeam(
  p: Principal,
  input: ListTeamInput,
  now: Date,
  exec: Executor = db,
): Promise<ListTeamResult> {
  const ctx = await teamContext(p, input.projectId, exec);
  if (input.projectId && ctx.visibleProjects === 0) return { ok: false, code: 'NOT_FOUND' };
  if (input.sort === 'overdue' && !canSortByLoad(p, ctx.myRoles))
    return { ok: false, code: 'SORT_NOT_ALLOWED' };
  const q = input.q?.trim().slice(0, TEAM_SEARCH_MAX);
  const limit = clampLimit(input.limit);
  const rows = await exec
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      jobTitle: profile.jobTitle,
      total: sql<number>`count(*) OVER ()`,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(
      and(
        accountActive,
        peopleVisibleTo(p, ctx, input.projectId),
        q ? ilike(user.name, likeText(q)) : undefined,
      ),
    )
    // Self first, then A-Z; the id breaks ties so paging is stable across requests.
    .orderBy(desc(eq(user.id, p.id)), asc(user.name), asc(user.id))
    .limit(limit)
    .offset(clampOffset(input.offset));

  const pageIds = rows.map((r) => r.id);
  const roles = await rolesOf(pageIds, projectsVisibleTo(p, ctx, input.projectId), exec);
  const scopes = rows.map((r) => ({
    userId: r.id,
    scope: narrow(
      loadScopeFor(
        p,
        r.id,
        ctx.myRoles,
        (roles.get(r.id) ?? []).map((x) => x.id),
      ),
      input.projectId,
    ),
  }));
  const loads = await loadForPeople(scopes, today(now), exec);
  const people: TeamPerson[] = rows.map((r) => {
    const load = loads.get(r.id);
    return {
      id: r.id,
      name: r.name,
      jobTitle: r.jobTitle ?? null,
      image: r.image ?? null,
      isSelf: r.id === p.id,
      projects: roles.get(r.id) ?? [],
      ...(load ? { load } : {}),
    };
  });
  if (input.sort === 'overdue') people.sort(byOverdue);
  const total = Number(rows[0]?.total ?? 0);
  return { summary: summarize(ctx, total, people), people, total };
}

/**
 * The `projectId` filter narrows what is counted as well as who is listed: a column headed by one
 * project must not carry work done elsewhere, not even the caller's own. Work left outside still
 * raises `alsoElsewhere`, so nothing silently disappears.
 */
function narrow(scope: LoadScope, projectId: string | undefined): LoadScope {
  if (!projectId || 'none' in scope) return scope;
  return scopeCovers(scope, projectId) ? { projectIds: new Set([projectId]) } : { none: true };
}

/** `overdue desc, name`; a person without visible numbers sorts last, not as a zero. */
function byOverdue(a: TeamPerson, b: TeamPerson): number {
  const score = (x: TeamPerson) => x.load?.overdue ?? -1;
  return score(b) - score(a) || a.name.localeCompare(b.name);
}

/**
 * One person's profile, the projects they share with the caller, and their open work when D10
 * allows it. Three statements at most. A person the caller shares no project with answers
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
      name: user.name,
      email: user.email,
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
  return {
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
