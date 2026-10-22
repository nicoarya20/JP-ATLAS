/**
 * "Proyek saya": running projects the viewer belongs to with their condition and progress. The numbers
 * come from `toListItem`, the same function the Proyek menu uses, so a project reads identically in
 * both places. Statements: the project rows, the tasks of those projects and the condition inputs
 * (two) — four however many projects there are.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, projectMember, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import type { ProjectCondition } from '../pm/enums';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { toListItem } from '../project/project.dto';
import { loadConditionInputs, planOf } from '../project/project-condition.query';
import { loadTasks, projectColumns } from '../project/project-rows.query';
import { HOME_PROJECT_SCAN, HOME_PROJECTS_MAX } from './home.config';
import type { HomeProject } from './home.dto';

/** Worst first; a project without a condition (cannot happen for `active`) sorts last. */
const CONDITION_RANK: Record<ProjectCondition, number> = { off_track: 0, at_risk: 1, on_track: 2 };
const UNRANKED = 3;

const rankOf = (c: ProjectCondition | null) => (c ? CONDITION_RANK[c] : UNRANKED);

/** Worst condition first, then the nearest due date (none last), then the name. */
export function byUrgency(a: HomeProject, b: HomeProject): number {
  return (
    rankOf(a.condition) - rankOf(b.condition) ||
    (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
    a.name.localeCompare(b.name)
  );
}

/**
 * The worst of my running projects, at most `HOME_PROJECTS_MAX`. Only the `HOME_PROJECT_SCAN` projects
 * due soonest are looked at, because the condition is computed in code and not stored.
 */
export async function getProjects(
  p: Principal,
  now: Date,
  exec: Executor = db,
): Promise<HomeProject[]> {
  const rows = await exec
    .select(projectColumns)
    .from(project)
    .innerJoin(
      projectMember,
      and(eq(projectMember.projectId, project.id), eq(projectMember.userId, p.id)),
    )
    .leftJoin(user, eq(user.id, project.leadId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(and(isLive(project), eq(project.status, 'active')))
    .orderBy(sql`${project.dueDate} ASC NULLS LAST`, asc(project.id))
    .limit(HOME_PROJECT_SCAN);
  const ids = rows.map((r) => r.id);
  const [tasks, plans] = await Promise.all([
    loadTasks(exec, ids),
    loadConditionInputs(ids, now, exec),
  ]);
  return rows
    .map((r): HomeProject => {
      const item = toListItem(r, tasks.get(r.id) ?? [], null, now, METRICS, planOf(plans, r.id));
      return {
        id: item.id,
        name: item.name,
        dueDate: item.dueDate,
        progress: item.progress,
        condition: item.condition?.level ?? null,
        reason: item.condition?.reason ?? null,
      };
    })
    .sort(byUrgency)
    .slice(0, HOME_PROJECTS_MAX);
}
