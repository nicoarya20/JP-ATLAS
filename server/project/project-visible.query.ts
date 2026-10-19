/** Shared read gate for project sub-resources (history, activity): the caller may see a live project. */
import { and, eq } from 'drizzle-orm';
import { canViewProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { project } from '../db/schema';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import { loadMembership } from './membership.query';

/** True when the project exists, is not in the Trash and the caller may read it (hidden = missing, D8). */
export async function canSeeProject(
  p: Principal,
  projectId: string,
  exec: Executor = db,
): Promise<boolean> {
  const [row] = await exec
    .select({
      id: project.id,
      status: project.status,
      leadId: project.leadId,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
    })
    .from(project)
    .where(and(eq(project.id, projectId), isLive(project)))
    .limit(1);
  if (!row) return false;
  const membership = (await loadMembership(p.id, [projectId], exec)).get(projectId) ?? null;
  return canViewProject(p, row, membership).ok;
}
