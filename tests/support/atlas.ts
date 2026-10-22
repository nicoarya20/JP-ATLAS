/** Atlas scenario for tests (S0B-30): builds the pure `atlas.data.ts` through the factories so cleanup tracks every row. */
import {
  type AtlasPersonKey,
  type AtlasProjectKey,
  type AtlasTaskKey,
  resolveAtlas,
} from '../../server/seed/atlas.data';
import { ATLAS_NOW } from './clock';
import type { TestProject } from './factory.project';
import type { Factory, TestTask } from './factory.task';
import type { TestUser } from './factory.user';

export type AtlasScenario = {
  now: Date;
  /** The calendar day in the team zone, `YYYY-MM-DD`. */
  today: string;
  users: Record<AtlasPersonKey, TestUser>;
  projects: Record<AtlasProjectKey, TestProject>;
  /** Keyed by name, never by task number: `number` is an identity column and not stable across runs. */
  tasks: Record<AtlasTaskKey, TestTask>;
};

/**
 * Creates the Atlas and Portal Klien projects with their people and tasks, with dates relative to `now`
 * (default `ATLAS_NOW`, the reference Wednesday). Call it in `beforeAll` inside `cleaner.shared` for read tests.
 */
export async function seedAtlas(f: Factory, o: { now?: Date } = {}): Promise<AtlasScenario> {
  const now = o.now ?? ATLAS_NOW;
  const data = resolveAtlas(now);

  const users = {} as Record<AtlasPersonKey, TestUser>;
  for (const p of data.people) users[p.key] = await f.user({ role: p.role, name: p.name });

  const projects = {} as Record<AtlasProjectKey, TestProject>;
  for (const p of data.projects) {
    projects[p.key] = await f.project({
      lead: users[p.lead],
      members: p.members.map(([key, role]) => [users[key], role] as const),
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      dueDate: p.dueDate,
      originalDueDate: p.originalDueDate,
      name: p.name,
      description: p.description,
    });
  }

  const tasks = {} as Record<AtlasTaskKey, TestTask>;
  for (const t of data.tasks) {
    tasks[t.key] = await f.task({
      project: projects[t.project],
      title: t.title,
      kind: t.kind,
      status: t.status,
      priority: t.priority,
      assignee: users[t.assignee],
      creator: users[t.creator],
      reviewer: t.reviewer ? users[t.reviewer] : null,
      needsReview: t.needsReview,
      due: t.dueDate,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      reviewRequestedAt: t.reviewRequestedAt,
      completedAt: t.completedAt,
      lastActivityAt: t.lastActivityAt,
    });
  }
  return { now, today: data.today, users, projects, tasks };
}
