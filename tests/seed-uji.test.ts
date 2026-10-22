/** `uji` seed scenario (S2-15): idempotent, dummy testers only, and the guard of the other seed commands. */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { verifyPassword } from 'better-auth/crypto';
import { and, count, eq, inArray, like } from 'drizzle-orm';
import { runSeed, type SeedDeps } from '../scripts/seed-dev';
import { db } from '../server/db';
import {
  account,
  project,
  projectMember,
  task,
  taskChecklistItem,
  user,
} from '../server/db/schema';
import { progress } from '../server/metrics/project.metrics';
import { SEED_ID_PREFIX } from '../server/seed/atlas.insert';
import {
  UJI_EMAIL_DOMAIN,
  UJI_T1_STEPS,
  UJI_T4_TITLE,
  UJI_TESTER_COUNT,
} from '../server/seed/uji.data';
import { UJI_ID_PREFIX } from '../server/seed/uji.insert';

const ENV = { NODE_ENV: 'test', SEED_ALLOW: '1', APP_TIME_ZONE: 'Asia/Jakarta' } as const;
// 01:30 on 8 Oct in Jakarta but still 7 Oct in UTC: "today" must follow APP_TIME_ZONE.
const NOW = new Date('2026-10-07T18:30:00Z');
const TODAY = '2026-10-08';
const UJI_LIKE = `${UJI_ID_PREFIX}%`;
const PASSWORD = 'sandi-uji-seed-1'; // test-only

function deps(useDb: boolean, now: Date = NOW) {
  const out: string[] = [];
  const err: string[] = [];
  const state = { loads: 0 };
  const d: SeedDeps = {
    loadDb: async () => {
      state.loads++;
      if (!useDb) throw new Error('database must not be opened');
      return db;
    },
    now: () => now,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
  return { d, out, err, state };
}
const uji = (env: Record<string, string> = {}) =>
  runSeed(['uji'], { ...ENV, SEED_PASSWORD: PASSWORD, ...env }, deps(true).d);
const reset = () => runSeed(['reset'], ENV, deps(true).d);

describe('uji seed guard (no database)', () => {
  it.each([
    ['production', { NODE_ENV: 'production', SEED_ALLOW: '1' }],
    ['no SEED_ALLOW', { NODE_ENV: 'development' }],
    ['SEED_ALLOW=true', { NODE_ENV: 'development', SEED_ALLOW: 'true' }],
  ])('refuses outside a dev database: %s', async (_label, env) => {
    const { d, err, state } = deps(false);
    expect<number>(await runSeed(['uji'], env, d)).toBe(1);
    expect<number>(state.loads).toBe(0);
    expect(err.join('\n')).toContain('Seed ditolak');
  });

  it('rejects a SEED_PASSWORD shorter than the sign-in minimum before opening the database', async () => {
    const { d, state } = deps(false);
    expect<number>(await runSeed(['uji'], { ...ENV, SEED_PASSWORD: 'short' }, d)).toBe(2);
    expect<number>(state.loads).toBe(0);
  });
});

describe('uji seed against the test DB', () => {
  const rows = async () => {
    const n = async (t: typeof user | typeof project | typeof task) => {
      const [r] = await db.select({ n: count() }).from(t).where(like(t.id, UJI_LIKE));
      return r?.n;
    };
    return { users: await n(user), projects: await n(project), tasks: await n(task) };
  };

  beforeEach(async () => {
    await reset();
  });
  afterAll(async () => {
    await reset();
  });

  it('seeds five approved dummy testers on `.invalid` addresses who can sign in', async () => {
    expect<number>(await uji()).toBe(0);
    const people = await db.select().from(user).where(like(user.id, UJI_LIKE));
    const testers = people.filter((p) => p.name.startsWith('Penguji-'));
    expect(testers.map((p) => p.name).sort()).toEqual(
      Array.from({ length: UJI_TESTER_COUNT }, (_, i) => `Penguji-${i + 1} (dummy)`),
    );
    for (const p of people) {
      expect(p.email.endsWith(`@${UJI_EMAIL_DOMAIN}`)).toBe(true);
      expect(p.approvalStatus).toBe('approved');
      expect(p.name).toContain('(dummy)');
    }
    for (const p of testers) expect(p.role).toBe('member');
    const creds = await db
      .select()
      .from(account)
      .where(
        inArray(
          account.userId,
          people.map((p) => p.id),
        ),
      );
    expect(creds).toHaveLength(people.length);
    for (const c of creds)
      expect(await verifyPassword({ hash: c.password ?? '', password: PASSWORD })).toBe(true);
  });

  it('makes every tester an Anggota of Renovasi Dapur', async () => {
    await uji();
    const [p] = await db.select().from(project).where(like(project.id, UJI_LIKE));
    expect(p?.name).toBe('Renovasi Dapur');
    const members = await db
      .select()
      .from(projectMember)
      .where(eq(projectMember.projectId, p?.id ?? ''));
    const byRole = (role: string) => members.filter((m) => m.role === role).length;
    expect(byRole('member')).toBe(UJI_TESTER_COUNT);
    expect(byRole('manager')).toBe(1);
  });

  it('gives each tester T1 (due today, 3 unticked steps) and T6 tasks, and no "Beli cat dapur"', async () => {
    await uji();
    const tasks = await db.select().from(task).where(like(task.id, UJI_LIKE));
    expect(tasks.some((t) => t.title === UJI_T4_TITLE)).toBe(false);
    const t1 = tasks.filter((t) => t.id.includes('-t1-'));
    expect(t1).toHaveLength(UJI_TESTER_COUNT);
    expect(new Set(t1.map((t) => t.assigneeId)).size).toBe(UJI_TESTER_COUNT);
    for (const t of t1) {
      expect(t.dueDate).toBe(TODAY);
      expect(t.status).toBe('todo');
      const steps = await db
        .select()
        .from(taskChecklistItem)
        .where(eq(taskChecklistItem.taskId, t.id));
      expect(steps.sort((a, b) => a.position - b.position).map((s) => s.text)).toEqual([
        ...UJI_T1_STEPS,
      ]);
      expect(steps.every((s) => !s.isDone)).toBe(true);
    }
    const t6 = tasks.filter((t) => t.id.includes('-t6-'));
    expect(t6).toHaveLength(UJI_TESTER_COUNT);
    for (const t of t6) expect(t.status).toBe('todo');
    // Only the T1 tasks are due today, so "Cari tugas yang harus selesai hari ini" has one answer.
    for (const a of new Set(tasks.map((t) => t.assigneeId))) {
      expect(
        tasks.filter((t) => t.assigneeId === a && t.dueDate === TODAY).length,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('leaves the project part-way done for T7 (neither 0 nor 100 percent)', async () => {
    await uji();
    const tasks = await db.select().from(task).where(like(task.projectId, UJI_LIKE));
    const { percent } = progress(tasks);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThan(100);
  });

  it('is idempotent: a second run refreshes the same rows, and the dates follow `now`', async () => {
    await uji();
    const first = await rows();
    const later = deps(true, new Date('2026-10-09T03:00:00Z'));
    expect<number>(await runSeed(['uji'], { ...ENV, SEED_PASSWORD: PASSWORD }, later.d)).toBe(0);
    expect(await rows()).toEqual(first);
    expect(first).toEqual({ users: 6, projects: 1, tasks: 17 });
    const [t1] = await db
      .select()
      .from(task)
      .where(and(like(task.id, UJI_LIKE), like(task.id, '%-t1-1')));
    expect(t1?.dueDate).toBe('2026-10-09');
    const [steps] = await db
      .select({ n: count() })
      .from(taskChecklistItem)
      .where(like(taskChecklistItem.taskId, UJI_LIKE));
    expect(steps?.n).toBe(UJI_TESTER_COUNT * UJI_T1_STEPS.length);
  });

  it('`reset` removes the uji rows and nothing outside the seed- prefix', async () => {
    await uji();
    expect(UJI_ID_PREFIX.startsWith(SEED_ID_PREFIX)).toBe(true);
    expect<number>(await reset()).toBe(0);
    expect(await rows()).toEqual({ users: 0, projects: 0, tasks: 0 });
  });
});
