/** Project factory (S0B-30): a project with its lead, members and default task kinds, tracked for cleanup. */
import { db } from '../../server/db';
import { project, projectMember, taskKind } from '../../server/db/schema';
import type {
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  TaskBaseKind,
} from '../../server/pm/enums';
import { DEFAULT_TASK_KINDS } from '../../server/pm/limits';
import type { Cleaner } from './cleanup';
import type { TestUser } from './factory.user';

export type TestProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  leadId: string;
  startDate: string | null;
  dueDate: string | null;
  /** Task kind id per base kind; every task needs one, so `f.task` looks it up here. */
  kinds: Record<TaskBaseKind, string>;
};

export type ProjectOptions = {
  lead: TestUser;
  /** Extra members; the lead is always a manager and is added on top when missing from this list. */
  members?: ReadonlyArray<readonly [TestUser, ProjectMemberRole]>;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  /** `YYYY-MM-DD`, or null for none. */
  startDate?: string | null;
  dueDate?: string | null;
  originalDueDate?: string | null;
  needsReviewDefault?: boolean;
  name?: string;
  description?: string;
};

export type ProjectFactory = { project(opts: ProjectOptions): Promise<TestProject> };

const ID_RANDOM_LENGTH = 8;

/** Builds `f.project(...)`; ids are `${tag}-${uuid8}`. Kinds and members go away with the project (cascade). */
export function createProjectFactory(cleaner: Cleaner, opts: { tag: string }): ProjectFactory {
  return {
    async project({
      lead,
      members = [],
      status = 'active',
      priority = 'medium',
      startDate = null,
      dueDate = null,
      originalDueDate = null,
      needsReviewDefault = false,
      name,
      description,
    }) {
      const id = `${opts.tag}-${crypto.randomUUID().slice(0, ID_RANDOM_LENGTH)}`;
      // Track before the insert so a half-failed creation is still swept.
      cleaner.track('project', id);
      const projectName = name ?? `Proyek ${id}`; // test-only
      await db.insert(project).values({
        id,
        name: projectName,
        description: description ?? null,
        status,
        priority,
        leadId: lead.id,
        startDate,
        dueDate,
        originalDueDate,
        tasksNeedReviewDefault: needsReviewDefault,
        createdBy: lead.id,
      });

      const roles = new Map<string, ProjectMemberRole>();
      for (const [member, role] of members) roles.set(member.id, role);
      roles.set(lead.id, 'manager'); // set last: the lead stays a manager even if listed with a lower role
      await db
        .insert(projectMember)
        .values(
          [...roles].map(([userId, role]) => ({ projectId: id, userId, role, addedBy: lead.id })),
        );

      const kindRows = DEFAULT_TASK_KINDS.map((k, position) => ({
        id: `${id}-kind-${k.baseKind}`,
        projectId: id,
        name: k.name,
        baseKind: k.baseKind,
        position,
      }));
      await db.insert(taskKind).values(kindRows);
      const kinds = Object.fromEntries(kindRows.map((k) => [k.baseKind, k.id])) as Record<
        TaskBaseKind,
        string
      >;
      return {
        id,
        name: projectName,
        status,
        priority,
        leadId: lead.id,
        startDate,
        dueDate,
        kinds,
      };
    },
  };
}
