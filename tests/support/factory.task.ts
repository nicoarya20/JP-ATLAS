/** Task factory (S0B-30): single and bulk task inserts, tracked for cleanup, plus the combined `createFactory`. */
import { db } from '../../server/db';
import { task } from '../../server/db/schema';
import type { ProjectPriority, TaskBaseKind, TaskStatus } from '../../server/pm/enums';
import type { Cleaner } from './cleanup';
import { createProjectFactory, type ProjectFactory, type TestProject } from './factory.project';
import { createUserFactory, type TestUser, type UserFactory } from './factory.user';

/** The full row, so it can be handed straight to the pure metrics (`TaskMetricsRow`, `ConditionTask`). */
export type TestTask = typeof task.$inferSelect;
type TaskInsert = typeof task.$inferInsert;

export type TaskInput = {
  project: TestProject;
  creator?: TestUser | null;
  assignee?: TestUser | null;
  reviewer?: TestUser | null;
  status?: TaskStatus;
  priority?: ProjectPriority;
  kind?: TaskBaseKind;
  title?: string;
  /** `YYYY-MM-DD`, or null for none. */
  due?: string | null;
  start?: string | null;
  needsReview?: boolean;
  reopenCount?: number;
  createdAt?: Date;
  startedAt?: Date | null;
  reviewRequestedAt?: Date | null;
  completedAt?: Date | null;
  lastActivityAt?: Date;
  deletedAt?: Date | null;
};

export type TaskFactory = {
  task(input: TaskInput): Promise<TestTask>;
  /** `n` tasks in one multi-row INSERT per chunk; `make(i)` overrides fields of the i-th task. */
  tasks(
    project: TestProject,
    n: number,
    make?: (i: number) => Partial<TaskInput>,
  ): Promise<TestTask[]>;
};

export type FactoryOptions = {
  tag?: string;
  /** Clock for the status timestamps a task implies; defaults to the (possibly frozen) system time. */
  now?: () => Date;
};

// 500 rows x ~30 columns stays far below Postgres' 65535 bind limit.
const INSERT_CHUNK = 500;
const ID_RANDOM_LENGTH = 8;

/** Fills the timestamps the status implies, so a `done` task always has `completedAt` and so on. */
function rowFor(id: string, input: TaskInput, now: Date, title: string): TaskInsert {
  const status = input.status ?? 'todo';
  const stamp = (given: Date | null | undefined, applies: boolean) =>
    given !== undefined ? given : applies ? now : null;
  const startedAt = stamp(input.startedAt, status !== 'todo');
  const completedAt = stamp(input.completedAt, status === 'done');
  const reviewRequestedAt = stamp(input.reviewRequestedAt, status === 'in_review');
  return {
    id,
    projectId: input.project.id,
    kindId: input.project.kinds[input.kind ?? 'task'],
    title,
    status,
    priority: input.priority ?? 'medium',
    assigneeId: input.assignee?.id ?? null,
    reviewerId: input.reviewer?.id ?? null,
    needsReview: input.needsReview ?? false,
    createdBy: input.creator?.id ?? null,
    startDate: input.start ?? null,
    dueDate: input.due ?? null,
    reopenCount: input.reopenCount ?? 0,
    // A canceled task must carry a category (CHECK), so the factory picks the least loaded one.
    ...(status === 'canceled' ? { cancelCategory: 'not_needed' as const, canceledAt: now } : {}),
    startedAt,
    reviewRequestedAt,
    completedAt,
    createdAt: input.createdAt ?? now,
    lastActivityAt: input.lastActivityAt ?? completedAt ?? reviewRequestedAt ?? startedAt ?? now,
    deletedAt: input.deletedAt ?? null,
  };
}

/** Builds `f.task(...)` and `f.tasks(...)`; ids are `${tag}-${uuid8}` and tracked before the insert. */
export function createTaskFactory(
  cleaner: Cleaner,
  opts: { tag: string; now?: () => Date },
): TaskFactory {
  const clock = opts.now ?? (() => new Date());
  const newId = () =>
    cleaner.track('task', `${opts.tag}-${crypto.randomUUID().slice(0, ID_RANDOM_LENGTH)}`);
  return {
    async task(input) {
      const id = newId();
      const [row] = await db
        .insert(task)
        .values(rowFor(id, input, clock(), input.title ?? `Tugas ${id}`)) // test-only
        .returning();
      if (!row) throw new Error(`Task insert returned no row for ${id}`);
      return row;
    },
    async tasks(project, n, make) {
      const now = clock();
      const rows: TaskInsert[] = Array.from({ length: n }, (_, i) => {
        const id = newId();
        return rowFor(id, { project, ...make?.(i) }, now, `Tugas uji ${i + 1}`); // test-only
      });
      const out: TestTask[] = [];
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        out.push(
          ...(await db
            .insert(task)
            .values(rows.slice(i, i + INSERT_CHUNK))
            .returning()),
        );
      }
      return out;
    },
  };
}

export type Factory = { tag: string } & UserFactory & ProjectFactory & TaskFactory;

/**
 * Composes the user, project and task factories into the single `f` the tests use. It lives with the
 * task factory because tasks are the last layer: they need a project, which needs users.
 */
export function createFactory(cleaner: Cleaner, opts: FactoryOptions = {}): Factory {
  const users = createUserFactory(cleaner, opts.tag ? { tag: opts.tag } : {});
  const { tag } = users;
  return {
    tag,
    user: users.user,
    ...createProjectFactory(cleaner, { tag }),
    ...createTaskFactory(cleaner, { tag, ...(opts.now ? { now: opts.now } : {}) }),
  };
}
