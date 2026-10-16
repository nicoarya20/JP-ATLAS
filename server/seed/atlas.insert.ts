/**
 * Writes the Atlas scenario into a real database and removes it again (S0B-30). Not imported by the
 * server: only `scripts/seed-dev.ts` and tests use it, so it never ships in the binary. The database is
 * a parameter and nothing here touches env, so importing this file is always safe.
 */
import { hashPassword } from 'better-auth/crypto';
import { inArray, like } from 'drizzle-orm';
import type { db } from '../db';
import { account, project, projectMember, task, taskKind, user } from '../db/schema';
import { DEFAULT_TASK_KINDS } from '../pm/limits';
import { type AtlasPersonKey, resolveAtlas } from './atlas.data';

/**
 * Every seeded id starts with this. A hyphen, not an underscore (X3 M22): `_` is a `LIKE` wildcard, so
 * `seed_%` would also match ids such as `seedXrow`. Keep it free of `%`, `_` and `\`.
 */
export const SEED_ID_PREFIX = 'seed-';

/** Dummy accounts live under the reserved `.test` TLD, so they can never be a real mailbox. */
const SEED_EMAIL_DOMAIN = 'example.test';
const CREDENTIAL_PROVIDER = 'credential';
// Keeps each statement far below Postgres' bind limit and the reset loop bounded.
const DELETE_CHUNK = 500;

export type SeedDb = typeof db;
/** Both the pool and a transaction handle satisfy this, so a seed run can be atomic. */
export type SeedExecutor = Pick<SeedDb, 'select' | 'insert' | 'delete'>;

export interface SeededAccount {
  readonly email: string;
  readonly name: string;
  readonly role: string;
}

export interface ResetCounts {
  readonly tasks: number;
  readonly projects: number;
  readonly users: number;
}

const userId = (key: AtlasPersonKey) => `${SEED_ID_PREFIX}user-${key}`;
const projectId = (key: string) => `${SEED_ID_PREFIX}project-${key}`;
const taskId = (key: string) => `${SEED_ID_PREFIX}task-${key}`;

async function deleteByIds(
  ex: SeedExecutor,
  table: typeof task | typeof project | typeof user,
  ids: string[],
): Promise<void> {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    await ex.delete(table).where(inArray(table.id, ids.slice(i, i + DELETE_CHUNK)));
  }
}

/**
 * Deletes seeded rows and nothing else: it lists the ids that start with `SEED_ID_PREFIX`, then deletes
 * those ids, children first (tasks, projects, users). There is no table-wide delete. Members, kinds,
 * task parts and credential accounts go with their parent through foreign-key cascades.
 */
export async function resetSeed(ex: SeedExecutor): Promise<ResetCounts> {
  const prefix = `${SEED_ID_PREFIX}%`;
  const tasks = (await ex.select({ id: task.id }).from(task).where(like(task.id, prefix))).map(
    (r) => r.id,
  );
  await deleteByIds(ex, task, tasks);
  const projects = (
    await ex.select({ id: project.id }).from(project).where(like(project.id, prefix))
  ).map((r) => r.id);
  await deleteByIds(ex, project, projects);
  const users = (await ex.select({ id: user.id }).from(user).where(like(user.id, prefix))).map(
    (r) => r.id,
  );
  await deleteByIds(ex, user, users);
  return { tasks: tasks.length, projects: projects.length, users: users.length };
}

/**
 * Seeds Atlas for `now`: approved accounts that can sign in with `password` (outside production),
 * two projects with members and default kinds, and the tasks. Existing seed rows are removed first so a
 * rerun refreshes the relative dates instead of failing on duplicate ids. Runs in one transaction.
 */
export async function insertAtlas(
  database: SeedDb,
  o: { now: Date; password: string },
): Promise<{ accounts: SeededAccount[]; reset: ResetCounts }> {
  const data = resolveAtlas(o.now);
  // Hash outside the transaction: it is slow by design and must not hold a connection open.
  const passwordHash = await hashPassword(o.password);

  return database.transaction(async (tx) => {
    const reset = await resetSeed(tx);

    const accounts: SeededAccount[] = data.people.map((p) => ({
      email: `${SEED_ID_PREFIX}${p.key}@${SEED_EMAIL_DOMAIN}`,
      name: p.name,
      role: p.role,
    }));
    await tx.insert(user).values(
      data.people.map((p, i) => ({
        id: userId(p.key),
        name: p.name,
        email: accounts[i]?.email ?? '',
        emailVerified: true,
        role: p.role,
        // The column default is `pending`; seeded accounts must be usable for login tests right away.
        approvalStatus: 'approved' as const,
        approvalDecidedAt: o.now,
      })),
    );
    await tx.insert(account).values(
      data.people.map((p) => ({
        id: `${SEED_ID_PREFIX}account-${p.key}`,
        accountId: userId(p.key),
        providerId: CREDENTIAL_PROVIDER,
        userId: userId(p.key),
        password: passwordHash,
        createdAt: o.now,
        updatedAt: o.now,
      })),
    );

    await tx.insert(project).values(
      data.projects.map((p) => ({
        id: projectId(p.key),
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        leadId: userId(p.lead),
        startDate: p.startDate,
        dueDate: p.dueDate,
        originalDueDate: p.originalDueDate,
        createdBy: userId(p.lead),
      })),
    );
    await tx.insert(projectMember).values(
      data.projects.flatMap((p) =>
        p.members.map(([key, role]) => ({
          projectId: projectId(p.key),
          userId: userId(key),
          role,
          addedBy: userId(p.lead),
        })),
      ),
    );
    await tx.insert(taskKind).values(
      data.projects.flatMap((p) =>
        DEFAULT_TASK_KINDS.map((k, position) => ({
          id: `${projectId(p.key)}-kind-${k.baseKind}`,
          projectId: projectId(p.key),
          name: k.name,
          baseKind: k.baseKind,
          position,
        })),
      ),
    );

    // `number` is left to the identity column: pinning #8..#17 would collide with a dev database that
    // already has tasks and would leave the sequence behind the pinned values.
    await tx.insert(task).values(
      data.tasks.map((t) => ({
        id: taskId(t.key),
        projectId: projectId(t.project),
        kindId: `${projectId(t.project)}-kind-${t.kind}`,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: userId(t.assignee),
        reviewerId: t.reviewer ? userId(t.reviewer) : null,
        needsReview: t.needsReview,
        createdBy: userId(t.creator),
        dueDate: t.dueDate,
        startedAt: t.startedAt,
        reviewRequestedAt: t.reviewRequestedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        lastActivityAt: t.lastActivityAt,
      })),
    );
    return { accounts, reset };
  });
}
