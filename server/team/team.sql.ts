/**
 * SQL fragments for the Team reads (S6 M02): the caller's own reach over live projects, and which
 * people and projects they may be told about. Kept apart from the query files so the list and the
 * detail share one definition of "what may this person see" (the same reason `task.sql.ts` exists).
 */
import { and, eq, inArray, isNotNull, type SQL, sql } from 'drizzle-orm';
import type { Principal, ProjectRole } from '../access/types';
import { db } from '../db';
import { project, projectMember, user } from '../db/schema';
import { isAdminRole } from '../permissions';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';

/** What the caller may see before any person is loaded: their own reach over live projects. */
export type TeamContext = {
  /** Live projects the caller may see, after the `projectId` filter; becomes `summary.projects`. */
  visibleProjects: number;
  /** Ids of those the caller is a member of; empty for an Admin who joined none. */
  myProjectIds: string[];
  /** The caller's project roles, the shape `loadScopeFor` reads; only `manager` rows matter to it. */
  myRoles: Map<string, ProjectRole>;
};

/**
 * One statement for the caller's context. It aggregates, so it always answers exactly one row:
 * `visibleProjects === 0` while a `projectId` is set means that project is missing, trashed or none
 * of the caller's business, which the list reports as `NOT_FOUND` (D8: hidden looks missing).
 */
export async function teamContext(
  p: Principal,
  projectId: string | undefined,
  exec: Executor,
): Promise<TeamContext> {
  const mine = and(eq(projectMember.projectId, project.id), eq(projectMember.userId, p.id));
  const [row] = await exec
    .select({
      visibleProjects: sql<number>`count(*)`,
      mineIds: sql<
        string[] | null
      >`array_agg(${project.id}) FILTER (WHERE ${projectMember.userId} IS NOT NULL)`,
      managedIds: sql<
        string[] | null
      >`array_agg(${project.id}) FILTER (WHERE ${projectMember.role} = 'manager')`,
    })
    .from(project)
    .leftJoin(projectMember, mine)
    .where(
      and(
        isLive(project),
        projectId ? eq(project.id, projectId) : undefined,
        // An Admin sees every live project; everyone else only the ones they joined.
        isAdminRole(p.appRole) ? undefined : isNotNull(projectMember.userId),
      ),
    );
  const myRoles = new Map<string, ProjectRole>();
  for (const id of row?.managedIds ?? []) myRoles.set(id, 'manager');
  return {
    visibleProjects: Number(row?.visibleProjects ?? 0),
    myProjectIds: row?.mineIds ?? [],
    myRoles,
  };
}

/** Which people the caller may list: anyone active for an Admin, else the members of their projects. */
export function peopleVisibleTo(
  p: Principal,
  ctx: TeamContext,
  projectId?: string,
): SQL | undefined {
  const inProjects = isAdminRole(p.appRole) ? (projectId ? [projectId] : null) : ctx.myProjectIds;
  if (inProjects === null) return undefined;
  if (inProjects.length === 0) return sql`false`; // a member of nothing has no team yet
  return inArray(
    user.id,
    db
      .select({ id: projectMember.userId })
      .from(projectMember)
      .where(inArray(projectMember.projectId, inProjects)),
  );
}

/**
 * The projects of the listed people the caller may be told about: the ones they share, or any live
 * project for an Admin. A Member must not learn that a colleague also works somewhere they cannot
 * see; that only ever surfaces as the `alsoElsewhere` flag, without a name or a number (D10).
 */
export function projectsVisibleTo(
  p: Principal,
  ctx: TeamContext,
  projectId?: string,
): SQL | undefined {
  if (!isAdminRole(p.appRole)) return inArray(project.id, ctx.myProjectIds);
  return projectId ? eq(project.id, projectId) : undefined;
}
