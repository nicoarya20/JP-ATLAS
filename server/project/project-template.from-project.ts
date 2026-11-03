/**
 * "Simpan sebagai template": saves the structure of an existing project (phases, tasks, rhythm in
 * day offsets) as one of the caller's private templates. Read-only on the project; the write goes
 * through `createTemplate()` so it shares its validation and transaction with every other template.
 */
import { and, asc, eq, ne } from 'drizzle-orm';
import { canSaveProjectAsTemplate } from '../access/project-template.policy';
import type { Principal } from '../access/types';
import { PROJECT_DRAFT_PHASES_MAX, PROJECT_DRAFT_TASKS_MAX } from '../ai/project-draft.limits';
import { db } from '../db';
import { project, projectPhase, task, taskKind } from '../db/schema';
import { isLive } from '../pm/soft-delete';
import { loadMembership } from './membership.query';
import { createTemplate } from './project-template.service';
import {
  buildTemplateSnapshot,
  type SnapshotOmitted,
  type SnapshotPhase,
  type SnapshotTask,
} from './project-template.snapshot';
import { refused, type WriteResult } from './project-write.rules';

export type SaveProjectAsTemplateInput = {
  /** Defaults to the project's name. */
  name?: string;
  /** Defaults to the project's description; `null` clears it. */
  description?: string | null;
};

export type SavedFromProject = { id: string; omitted: SnapshotOmitted };

/** The project's live phases and non-canceled live tasks, each in display order. */
async function loadSnapshotRows(projectId: string): Promise<{
  phases: SnapshotPhase[];
  tasks: SnapshotTask[];
}> {
  const phases = await db
    .select({
      id: projectPhase.id,
      name: projectPhase.name,
      description: projectPhase.description,
      startDate: projectPhase.startDate,
      endDate: projectPhase.endDate,
    })
    .from(projectPhase)
    .where(eq(projectPhase.projectId, projectId))
    .orderBy(asc(projectPhase.position), asc(projectPhase.createdAt), asc(projectPhase.id));
  const tasks = await db
    .select({
      title: task.title,
      description: task.description,
      priority: task.priority,
      kindName: taskKind.name,
      dueDate: task.dueDate,
      phaseId: task.phaseId,
    })
    .from(task)
    .leftJoin(taskKind, eq(taskKind.id, task.kindId))
    // Canceled work was dropped from the plan, so it is not part of the shape worth repeating.
    .where(and(eq(task.projectId, projectId), isLive(task), ne(task.status, 'canceled')))
    .orderBy(asc(task.createdAt), asc(task.id));
  return { phases, tasks };
}

/**
 * Saves `projectId` as a template owned by `p`. A hidden or missing project (and one in the Trash)
 * answers NOT_FOUND; a viewer who is not a Project Manager or above is refused like any template
 * write. A project bigger than one template can hold (`PROJECT_DRAFT_*_MAX`, the same cap a project
 * created from it would have) is saved up to the cap and `omitted` says how much was left out.
 */
export async function saveProjectAsTemplate(
  p: Principal,
  projectId: string,
  input: SaveProjectAsTemplateInput = {},
): Promise<WriteResult<SavedFromProject>> {
  const [row] = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      leadId: project.leadId,
      startDate: project.startDate,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
    })
    .from(project)
    .where(eq(project.id, projectId));
  if (!row) return { ok: false, code: 'NOT_FOUND' };

  const membership = (await loadMembership(p.id, [projectId])).get(projectId) ?? null;
  const decision = canSaveProjectAsTemplate(p, row, membership);
  if (!decision.ok) return refused(decision);

  const { phases, tasks } = await loadSnapshotRows(projectId);
  const snapshot = buildTemplateSnapshot(
    { projectStart: row.startDate, phases, tasks },
    { maxPhases: PROJECT_DRAFT_PHASES_MAX, maxTasks: PROJECT_DRAFT_TASKS_MAX },
  );
  const created = await createTemplate(p, {
    name: input.name?.trim() || row.name,
    description: input.description === undefined ? row.description : input.description,
    source: 'project',
    phases: snapshot.phases,
    looseTasks: snapshot.looseTasks,
  });
  if (!created.ok) return created;
  return { ok: true, value: { id: created.value.id, omitted: snapshot.omitted } };
}
