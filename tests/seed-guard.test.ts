/**
 * Guard and reset of the dev seed script (S0B-30): it refuses in production and without SEED_ALLOW=1
 * before touching the database, seeds approved loginable accounts, and `reset` deletes only `seed-…` rows.
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { verifyPassword } from 'better-auth/crypto';
import { count, eq, inArray, like } from 'drizzle-orm';
import { resolveSeedPassword, runSeed, type SeedDeps, seedRefusal } from '../scripts/seed-dev';
import { db } from '../server/db';
import { account, project, projectMember, task, taskKind, user } from '../server/db/schema';
import { progress } from '../server/metrics/project.metrics';
import { SEED_ID_PREFIX } from '../server/seed/atlas.insert';
import { createCleaner } from './support/cleanup';
import { ATLAS_NOW } from './support/clock';
import { createFactory } from './support/factory.task';

const ALLOWED = { NODE_ENV: 'test', SEED_ALLOW: '1' } as const;
const SEED_LIKE = `${SEED_ID_PREFIX}%`;

/** Deps that record output and count database loads; `useDb` decides whether the load succeeds. */
function recordingDeps(useDb: boolean) {
  const out: string[] = [];
  const err: string[] = [];
  const state = { loads: 0 };
  const deps: SeedDeps = {
    loadDb: async () => {
      state.loads++;
      if (!useDb) throw new Error('database must not be opened');
      return db;
    },
    now: () => ATLAS_NOW,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
  return { deps, out, err, state };
}

describe('seed guard (no database)', () => {
  const refused: Array<[string, Record<string, string>]> = [
    ['production with SEED_ALLOW=1', { NODE_ENV: 'production', SEED_ALLOW: '1' }],
    ['production without SEED_ALLOW', { NODE_ENV: 'production' }],
    ['no SEED_ALLOW', { NODE_ENV: 'development' }],
    ['SEED_ALLOW=true (only the exact 1 counts)', { NODE_ENV: 'development', SEED_ALLOW: 'true' }],
    ['SEED_ALLOW=0', { NODE_ENV: 'development', SEED_ALLOW: '0' }],
    ['empty SEED_ALLOW', { NODE_ENV: 'development', SEED_ALLOW: '' }],
  ];

  it.each(refused)('refuses: %s', (_label, env) => {
    expect(seedRefusal(env)).not.toBeNull();
  });

  it('allows SEED_ALLOW=1 outside production', () => {
    expect(seedRefusal({ NODE_ENV: 'development', SEED_ALLOW: '1' })).toBeNull();
    expect(seedRefusal({ SEED_ALLOW: '1' })).toBeNull();
  });

  it.each(refused)('runSeed exits 1 before opening the database: %s', async (_label, env) => {
    for (const command of ['atlas', 'reset']) {
      const { deps, err, state } = recordingDeps(false);
      const code = await runSeed([command], env, deps);
      expect<number>(code).toBe(1);
      expect<number>(state.loads).toBe(0);
      expect(err.join('\n')).toContain('Seed ditolak');
    }
  });

  it('exits 2 for `load` (arrives with S2) and for an unknown or missing command', async () => {
    for (const argv of [['load'], ['wipe'], []]) {
      const { deps, state } = recordingDeps(false);
      expect<number>(await runSeed(argv, ALLOWED, deps)).toBe(2);
      expect<number>(state.loads).toBe(0);
    }
  });

  it('reports a database that cannot be reached instead of throwing', async () => {
    const { deps, err } = recordingDeps(false);
    expect<number>(await runSeed(['reset'], ALLOWED, deps)).toBe(1);
    expect(err.join('\n')).toContain('Database belum siap');
  });

  it('uses SEED_PASSWORD when set and a fresh random one otherwise', () => {
    expect(resolveSeedPassword({ SEED_PASSWORD: 'dari-env-123' })).toEqual({
      // test-only
      password: 'dari-env-123',
      generated: false,
    });
    const a = resolveSeedPassword({});
    const b = resolveSeedPassword({ SEED_PASSWORD: '  ' });
    expect(a.generated).toBe(true);
    expect(a.password.length).toBeGreaterThanOrEqual(16);
    expect(a.password).not.toBe(b.password);
  });

  it('rejects a SEED_PASSWORD shorter than the sign-in minimum', async () => {
    const { deps, state } = recordingDeps(false);
    expect<number>(await runSeed(['atlas'], { ...ALLOWED, SEED_PASSWORD: 'short' }, deps)).toBe(2);
    expect<number>(state.loads).toBe(0);
  });

  it('uses an id prefix without LIKE wildcards (a hyphen, not seed_)', () => {
    expect(SEED_ID_PREFIX).toBe('seed-');
    expect(SEED_ID_PREFIX).not.toMatch(/[_%\\]/);
  });
});

describe('atlas and reset against the test DB', () => {
  const cleaner = createCleaner();
  const f = createFactory(cleaner);
  const seedRows = async () => {
    const [users] = await db.select({ n: count() }).from(user).where(like(user.id, SEED_LIKE));
    const [projects] = await db
      .select({ n: count() })
      .from(project)
      .where(like(project.id, SEED_LIKE));
    const [tasks] = await db.select({ n: count() }).from(task).where(like(task.id, SEED_LIKE));
    return { users: users?.n, projects: projects?.n, tasks: tasks?.n };
  };

  afterAll(async () => {
    // A failed assertion must not leave seed rows behind in the shared test DB.
    await runSeed(['reset'], ALLOWED, recordingDeps(true).deps);
    await cleaner.flushAll();
  });

  it('`atlas` seeds approved accounts that can sign in with the printed password', async () => {
    const { deps, out } = recordingDeps(true);
    expect<number>(await runSeed(['atlas'], ALLOWED, deps)).toBe(0);

    const rows = await db.select().from(user).where(like(user.id, SEED_LIKE));
    expect(rows.map((r) => r.role).sort()).toEqual([
      'admin',
      'member',
      'member',
      'member',
      'project_manager',
    ]);
    for (const r of rows) {
      expect(r.approvalStatus).toBe('approved');
      expect(r.banned).toBeFalsy();
      expect(r.email.endsWith('@example.test')).toBe(true);
    }

    const printed = out.find((l) => l.startsWith('Sandi semua akun'))?.split(': ')[1];
    expect(printed).toBeTruthy();
    expect(out.filter((l) => l.includes(printed ?? '?'))).toHaveLength(1);
    const creds = await db
      .select()
      .from(account)
      .where(
        inArray(
          account.userId,
          rows.map((r) => r.id),
        ),
      );
    expect(creds).toHaveLength(rows.length);
    for (const c of creds) {
      expect(c.providerId).toBe('credential');
      expect(c.password).not.toContain(printed ?? '?');
      expect(await verifyPassword({ hash: c.password ?? '', password: printed ?? '' })).toBe(true);
    }
  });

  it('`atlas` keeps SEED_PASSWORD out of the output and is safe to run twice', async () => {
    const password = 'sandi-uji-seed-1'; // test-only
    const { deps, out } = recordingDeps(true);
    expect<number>(await runSeed(['atlas'], { ...ALLOWED, SEED_PASSWORD: password }, deps)).toBe(0);
    expect(out.join('\n')).not.toContain(password);
    expect(await seedRows()).toEqual({ users: 5, projects: 2, tasks: 7 });
  });

  it('seeded Atlas has the golden progress (1 of 6, 17) read from the database', async () => {
    const rows = await db
      .select()
      .from(task)
      .where(eq(task.projectId, `${SEED_ID_PREFIX}project-atlas`));
    expect(rows).toHaveLength(6);
    expect(progress(rows).percent).toBe(17);
  });

  it('`reset` deletes only seed- rows and leaves look-alikes and test data alone', async () => {
    // `seedXbystander` matches the old `seed_%` pattern but not `seed-%`; the factory rows carry a test tag.
    const lookAlike = cleaner.track('user', `seedXbystander-${crypto.randomUUID().slice(0, 8)}`);
    await db.insert(user).values({
      id: lookAlike,
      name: 'Bukan seed', // test-only
      email: `${lookAlike}@example.test`,
      approvalStatus: 'approved',
    });
    const owner = await f.user();
    const other = await f.project({ lead: owner });
    const otherTask = await f.task({ project: other, assignee: owner });
    expect((await seedRows()).users).toBe(5);

    const { deps, out } = recordingDeps(true);
    expect<number>(await runSeed(['reset'], ALLOWED, deps)).toBe(0);
    expect(out.join('\n')).toContain('Seed dihapus');

    expect(await seedRows()).toEqual({ users: 0, projects: 0, tasks: 0 });
    // Children went with their seed parents through the cascades.
    const leftover = await Promise.all([
      db.select({ n: count() }).from(account).where(like(account.id, SEED_LIKE)),
      db.select({ n: count() }).from(projectMember).where(like(projectMember.projectId, SEED_LIKE)),
      db.select({ n: count() }).from(taskKind).where(like(taskKind.projectId, SEED_LIKE)),
    ]);
    expect(leftover.map((r) => r[0]?.n)).toEqual([0, 0, 0]);

    const survivors = await db
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.id, [lookAlike, owner.id]));
    expect(survivors.map((r) => r.id).sort()).toEqual([lookAlike, owner.id].sort());
    expect(
      await db.select({ id: project.id }).from(project).where(eq(project.id, other.id)),
    ).toHaveLength(1);
    expect(
      await db.select({ id: task.id }).from(task).where(eq(task.id, otherTask.id)),
    ).toHaveLength(1);
  });

  it('`reset` on an already clean database is a no-op', async () => {
    const { deps, out } = recordingDeps(true);
    expect<number>(await runSeed(['reset'], ALLOWED, deps)).toBe(0);
    expect(out.join('\n')).toContain('0 tugas, 0 proyek, 0 akun');
  });
});
