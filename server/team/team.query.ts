/**
 * Team reads (S6 M02, P7 §5): who shares projects with the caller, their role in each, and — only
 * where D10 allows it — how much open work they carry.
 *
 * Five statements at most per list, whatever the page size: the caller's project context, the page
 * of people with its total, the page's project roles, the load of the people who have a scope, and
 * the leave status of the people on the page.
 * Visibility is decided in SQL and in `loadScopeFor`, so a response never carries a number the
 * caller may not see.
 */
import { and, asc, desc, eq, ilike, inArray, type SQL, sql } from 'drizzle-orm';
import { canSortByLoad, type LoadScope, loadScopeFor, scopeCovers } from '../access/team.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import { leaveStatusFor } from '../leave/leave.status.query';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import { getMetrics } from '../pm/metrics-env';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { accountActive, likeText } from './account-active';
import type {
  ListTeamInput,
  ListTeamResult,
  TeamPerson,
  TeamProjectRef,
  TeamSummary,
} from './team.dto';
import { loadForPeople } from './team.load.query';
import { isLoadSort, sortByLoad, TEAM_SORT_SCAN_LIMIT } from './team.sort';
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

/** Project roles of the listed people, in one statement; non-members simply have no row. */
async function rolesOf(
  ids: readonly string[],
  visible: SQL | undefined,
  exec: Executor,
): Promise<Map<string, TeamProjectRef[]>> {
  const byUser = new Map<string, TeamProjectRef[]>();
  if (ids.length === 0) return byUser;
  const rows = await exec
    .select({
      userId: projectMember.userId,
      id: project.id,
      name: project.name,
      role: projectMember.role,
    })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(inArray(projectMember.userId, [...ids]), isLive(project), visible))
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
 * `sort=active|overdue` ranks the whole filtered team (`team.sort.ts`): up to
 * `TEAM_SORT_SCAN_LIMIT` people are read in name order, counted, ranked, and only then paged, with
 * the same five statements as a name page (leave is read for the page only, not the scan window). A caller `canSortByLoad` rejects is refused
 * `SORT_NOT_ALLOWED` rather than quietly given the name order; deciding it here costs no extra
 * statement, since the caller's project roles are already loaded (the route maps the code).
 */
export async function listTeam(
  p: Principal,
  input: ListTeamInput,
  now: Date,
  exec: Executor = db,
): Promise<ListTeamResult> {
  const ctx = await teamContext(p, input.projectId, exec);
  if (input.projectId && ctx.visibleProjects === 0) return { ok: false, code: 'NOT_FOUND' };
  if (isLoadSort(input.sort) && !canSortByLoad(p, ctx.myRoles))
    return { ok: false, code: 'SORT_NOT_ALLOWED' };
  const q = input.q?.trim().slice(0, TEAM_SEARCH_MAX);
  const limit = clampLimit(input.limit);
  const offset = clampOffset(input.offset);
  // A load sort has to see everybody it ranks, so it scans a window instead of reading one page.
  const byLoad = isLoadSort(input.sort);
  const rows = await exec
    .select({
      id: user.id,
      name: displayNameSql,
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
        q ? ilike(displayNameSql, likeText(q)) : undefined,
      ),
    )
    // Self first, then A-Z; the id breaks ties so paging is stable across requests.
    .orderBy(desc(eq(user.id, p.id)), asc(displayNameSql), asc(user.id))
    .limit(byLoad ? TEAM_SORT_SCAN_LIMIT : limit)
    .offset(byLoad ? 0 : offset);

  const roles = await rolesOf(
    rows.map((r) => r.id),
    projectsVisibleTo(p, ctx, input.projectId),
    exec,
  );
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
  const everyone = rows.map((r) => {
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
  const paged = isLoadSort(input.sort)
    ? sortByLoad(everyone, input.sort).slice(offset, offset + limit)
    : everyone;
  const leave = await leaveStatusFor(
    paged.map((x) => x.id),
    today(now),
    exec,
  );
  const people: TeamPerson[] = paged.map((x) => ({ ...x, availability: leave.get(x.id) ?? null }));
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
