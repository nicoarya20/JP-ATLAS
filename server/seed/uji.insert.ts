/**
 * Writes the user-test scenario (`uji`, S2-15) into a real database and removes it again. Like the Atlas
 * seed it is not imported by the server: only `scripts/seed-dev.ts` and tests use it, so it never ships in
 * the binary. The database is a parameter and nothing here touches env.
 */
import { hashPassword } from 'better-auth/crypto';
import { inArray, like } from 'drizzle-orm';
import {
  account,
  project,
  projectMember,
  task,
  taskChecklistItem,
  taskKind,
  user,
} from '../db/schema';
import { DEFAULT_TASK_KINDS } from '../pm/limits';
import {
  type ResetCounts,
  SEED_ID_PREFIX,
  type SeedDb,
  type SeedExecutor,
  type SeededAccount,
} from './atlas.insert';
import {
  resolveUji,
  UJI_EMAIL_DOMAIN,
  UJI_FACILITATOR,
  UJI_PROJECT_NAME,
  UJI_TESTERS,
  type UjiPersonKey,
} from './uji.data';

/** Own prefix inside `seed-`, so `uji` can be rerun without touching Atlas rows (`reset` still removes both). */
export const UJI_ID_PREFIX = `${SEED_ID_PREFIX}uji-`;
const CREDENTIAL_PROVIDER = 'credential';
const PROJECT_ID = `${UJI_ID_PREFIX}project-dapur`;
const KIND_ID = `${PROJECT_ID}-kind-task`;
const DELETE_CHUNK = 500;

const userId = (key: UjiPersonKey) => `${UJI_ID_PREFIX}user-${key}`;
const taskId = (key: string) => `${UJI_ID_PREFIX}task-${key}`;

async function deleteByIds(
  ex: SeedExecutor,
  table: typeof task | typeof project | typeof user,
  ids: string[],
): Promise<void> {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    await ex.delete(table).where(inArray(table.id, ids.slice(i, i + DELETE_CHUNK)));
  }
}

/** Deletes only rows whose id starts with `UJI_ID_PREFIX` (tasks, project, users); the rest cascades. */
export async function resetUji(ex: SeedExecutor): Promise<ResetCounts> {
  const prefix = `${UJI_ID_PREFIX}%`;
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
 * Seeds "Renovasi Dapur" with the dummy testers for `now`: approved members that can sign in with
 * `password`, the facilitator as Pengelola, and the tasks T1..T7 need. Earlier `uji` rows are removed
 * first so a rerun refreshes the relative dates instead of failing on duplicate ids. One transaction.
 */
export async function insertUji(
  database: SeedDb,
  o: { now: Date; password: string; timeZone?: string },
): Promise<{ accounts: SeededAccount[]; reset: ResetCounts }> {
  const data = resolveUji(o.now, o.timeZone);
  // Hash outside the transaction: it is slow by design and must not hold a connection open.
  const passwordHash = await hashPassword(o.password);

  return database.transaction(async (tx) => {
    const reset = await resetUji(tx);
    const accounts: SeededAccount[] = data.people.map((p) => ({
      email: `${UJI_ID_PREFIX}${p.mailbox}@${UJI_EMAIL_DOMAIN}`,
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
        approvalStatus: 'approved' as const,
        approvalDecidedAt: o.now,
      })),
    );
    await tx.insert(account).values(
      data.people.map((p) => ({
        id: `${UJI_ID_PREFIX}account-${p.key}`,
        accountId: userId(p.key),
        providerId: CREDENTIAL_PROVIDER,
        userId: userId(p.key),
        password: passwordHash,
        createdAt: o.now,
        updatedAt: o.now,
      })),
    );
    await tx.insert(project).values({
      id: PROJECT_ID,
      name: UJI_PROJECT_NAME,
      description: 'Data contoh untuk uji pengguna putaran 1. Semua orang di dalamnya fiktif.',
      status: 'active',
      priority: 'medium',
      leadId: userId(UJI_FACILITATOR.key),
      startDate: data.startDate,
      dueDate: data.dueDate,
      createdBy: userId(UJI_FACILITATOR.key),
    });
    await tx.insert(projectMember).values([
      {
        projectId: PROJECT_ID,
        userId: userId(UJI_FACILITATOR.key),
        role: 'manager' as const,
        addedBy: userId(UJI_FACILITATOR.key),
      },
      ...UJI_TESTERS.map((p) => ({
        projectId: PROJECT_ID,
        userId: userId(p.key),
        role: 'member' as const,
        addedBy: userId(UJI_FACILITATOR.key),
      })),
    ]);
    await tx.insert(taskKind).values(
      DEFAULT_TASK_KINDS.map((k, position) => ({
        id: `${PROJECT_ID}-kind-${k.baseKind}`,
        projectId: PROJECT_ID,
        name: k.name,
        baseKind: k.baseKind,
        position,
      })),
    );
    await tx.insert(task).values(
      data.tasks.map((t) => ({
        id: taskId(t.key),
        projectId: PROJECT_ID,
        kindId: KIND_ID,
        title: t.title,
        status: t.status,
        priority: 'medium' as const,
        assigneeId: userId(t.assignee),
        createdBy: userId(UJI_FACILITATOR.key),
        dueDate: t.dueDate,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        lastActivityAt: t.lastActivityAt,
      })),
    );
    const steps = data.tasks.flatMap((t) =>
      t.steps.map((text, position) => ({ taskId: taskId(t.key), text, position })),
    );
    if (steps.length > 0) await tx.insert(taskChecklistItem).values(steps);
    return { accounts, reset };
  });
}
