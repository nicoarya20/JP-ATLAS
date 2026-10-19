/** Row loaders the project reads share: the selected columns, one live project, and the tasks of many (S1-02). */
import { and, eq, inArray, ne } from 'drizzle-orm';
import { project, task, user } from '../db/schema';
import type { ConditionTask } from '../metrics/condition';
import { isLive } from '../pm/soft-delete';
import type { Executor } from '../pm/tx';
import type { ProjectRow } from './project.dto';

export const projectColumns = {
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status,
  priority: project.priority,
  leadId: project.leadId,
  leadName: user.name,
  startDate: project.startDate,
  dueDate: project.dueDate,
  originalDueDate: project.originalDueDate,
  deletedAt: project.deletedAt,
  deletedBy: project.deletedBy,
};

/**
 * Tasks of the given projects that still count: live and not canceled, which is exactly the
 * pool `progress()` and `computeCondition()` read. One statement for any number of projects.
 */
export async function loadTasks(exec: Executor, ids: readonly string[]) {
  const byProject = new Map<string, ConditionTask[]>();
  if (ids.length === 0) return byProject;
  const rows = await exec
    .select({
      projectId: task.projectId,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      deletedAt: task.deletedAt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      canceledAt: task.canceledAt,
      lastActivityAt: task.lastActivityAt,
      reopenCount: task.reopenCount,
    })
    .from(task)
    .where(and(inArray(task.projectId, [...ids]), isLive(task), ne(task.status, 'canceled')));
  for (const { projectId, ...t } of rows) {
    const list = byProject.get(projectId) ?? [];
    list.push(t);
    byProject.set(projectId, list);
  }
  return byProject;
}

/** One live project with its lead's name, or undefined for a missing or trashed id. */
export async function loadProject(exec: Executor, id: string): Promise<ProjectRow | undefined> {
  const [row] = await exec
    .select(projectColumns)
    .from(project)
    .leftJoin(user, eq(user.id, project.leadId))
    .where(and(eq(project.id, id), isLive(project)))
    .limit(1);
  return row;
}
