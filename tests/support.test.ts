/**
 * Behaviour of the shared test helpers in tests/support (S0B-21): cleaner order and error
 * collection, auth spy restore, uniform API error check, audit polling, frozen clock, user factory.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { auth } from '../server/auth';
import { db } from '../server/db';
import {
  auditLog,
  project,
  task,
  taskChecklistItem,
  taskKind,
  user,
  userInvitation,
} from '../server/db/schema';
import * as rolesMod from '../server/roles';
import { type ApiResult, call, expectApiError, waitForAudit } from './support/api';
import { installAuthSpies } from './support/auth';
import { CLEANUP_ORDER, type CleanupKind, createCleaner } from './support/cleanup';
import { ATLAS_NOW, freezeAt } from './support/clock';
import { createUserFactory } from './support/factory.user';

const LOADED_AT = Date.now();
const realGetSession = auth.api.getSession;
const realResolveUserRole = rolesMod.resolveUserRole;
const TAG = `sup${crypto.randomUUID().slice(0, 8)}`;

/** Records every deleter call so order, ids and failures can be asserted without a database. */
function recordingCleaner(failOn: CleanupKind[] = []) {
  const calls: Array<{ kind: CleanupKind; ids: string[] }> = [];
  const cleaner = createCleaner(async (kind, ids) => {
    calls.push({ kind, ids });
    if (failOn.includes(kind)) throw new Error(`boom ${kind}`);
  });
  return { cleaner, calls };
}

describe('createCleaner', () => {
  test('deletes kinds in child-before-parent order whatever the tracking order', async () => {
    const { cleaner, calls } = recordingCleaner();
    for (const kind of [...CLEANUP_ORDER].reverse()) cleaner.track(kind, `${kind}-1`);
    cleaner.track('user', 'user-2');
    await cleaner.flushAll();
    expect(calls.map((c) => c.kind)).toEqual([
      'taskPart',
      'task',
      'project',
      'invitation',
      'audit',
      'user',
    ]);
    expect(calls.at(-1)?.ids).toEqual(['user-1', 'user-2']);
  });

  test('track returns the id and flushTest leaves file-scope (shared) rows for flushAll', async () => {
    const { cleaner, calls } = recordingCleaner();
    expect(cleaner.track('user', 'per-test')).toBe('per-test');
    await cleaner.shared(async () => {
      cleaner.track('project', 'per-file');
    });
    await cleaner.flushTest();
    expect(calls).toEqual([{ kind: 'user', ids: ['per-test'] }]);
    await cleaner.flushAll();
    expect(calls.at(-1)).toEqual({ kind: 'project', ids: ['per-file'] });
    expect(calls).toHaveLength(2);
  });

  test('shared() keeps tracking at file scope when the callback throws', async () => {
    const { cleaner, calls } = recordingCleaner();
    await expect(
      cleaner.shared(async () => {
        throw new Error('setup failed');
      }),
    ).rejects.toThrow('setup failed');
    cleaner.track('user', 'after-throw');
    await cleaner.flushTest();
    expect(calls).toEqual([{ kind: 'user', ids: ['after-throw'] }]);
  });

  test('collects every failure into one AggregateError and still runs the later steps', async () => {
    const { cleaner, calls } = recordingCleaner(['task', 'audit']);
    for (const kind of CLEANUP_ORDER) cleaner.track(kind, `${kind}-x`);
    const err = await cleaner.flushAll().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AggregateError);
    const agg = err as AggregateError;
    expect(agg.errors).toHaveLength(2);
    expect(agg.errors.map((e: Error) => e.message)).toEqual([
      'cleanup of 1 task row(s) failed: boom task',
      'cleanup of 1 audit row(s) failed: boom audit',
    ]);
    expect((agg.errors[0] as Error).cause).toBeInstanceOf(Error);
    // Steps after a failure still ran, so one bad delete cannot leak the users.
    expect(calls.map((c) => c.kind)).toEqual([...CLEANUP_ORDER]);
  });

  test('a failed flush is not retried by the next flush', async () => {
    const { cleaner, calls } = recordingCleaner(['user']);
    cleaner.track('user', 'u1');
    await expect(cleaner.flushTest()).rejects.toBeInstanceOf(AggregateError);
    await cleaner.flushAll();
    expect(calls).toHaveLength(1);
  });

  test('deletes real rows by id, children first, and leaves untracked rows alone', async () => {
    const cleaner = createCleaner();
    const f = createUserFactory(cleaner, { tag: TAG });
    const lead = await f.user();
    const bystander = await createUserFactory(createCleaner(), { tag: `${TAG}by` }).user();
    const [proj] = await db
      .insert(project)
      .values({ name: `${TAG} proyek`, leadId: lead.id })
      .returning();
    cleaner.track('project', proj.id);
    const [kind] = await db
      .insert(taskKind)
      .values({ projectId: proj.id, name: 'Tugas', baseKind: 'task', position: 0 })
      .returning();
    const [tsk] = await db
      .insert(task)
      .values({ projectId: proj.id, kindId: kind.id, title: `${TAG} tugas` })
      .returning();
    cleaner.track('task', tsk.id);
    const [part] = await db
      .insert(taskChecklistItem)
      .values({ taskId: tsk.id, text: 'langkah', position: 0 })
      .returning();
    cleaner.track('taskPart', part.id);
    const [inv] = await db
      .insert(userInvitation)
      .values({ email: `${TAG}@kantor.id`, expiresAt: new Date(Date.now() + 60_000) }) // test-only
      .returning();
    cleaner.track('invitation', inv.id);
    const [audit] = await db
      .insert(auditLog)
      .values({
        action: `${TAG}.test`,
        targetType: 'test',
        summary: 'support test',
        actorId: lead.id,
      })
      .returning();
    cleaner.track('audit', audit.id);

    await cleaner.flushTest();

    const left = async (table: typeof user | typeof project | typeof task, ids: string[]) =>
      (await db.select({ id: table.id }).from(table).where(inArray(table.id, ids))).length;
    expect(await left(user, [lead.id])).toBe(0);
    expect(await left(project, [proj.id])).toBe(0);
    expect(await left(task, [tsk.id])).toBe(0);
    expect(await left(user, [bystander.id])).toBe(1);
    await db.delete(user).where(eq(user.id, bystander.id));
  });
});

describe('createUserFactory', () => {
  const cleaner = createCleaner();
  const f = createUserFactory(cleaner, { tag: TAG });
  afterEach(() => cleaner.flushTest());

  test('inserts an approved member with a tag-prefixed id by default', async () => {
    const u = await f.user();
    expect(u.id).toMatch(new RegExp(`^${TAG}-[0-9a-f]{8}$`));
    const [row] = await db.select().from(user).where(eq(user.id, u.id));
    expect(row).toMatchObject({ role: 'member', approvalStatus: 'approved', banned: false });
    expect(row.email).toBe(u.email);
  });

  test('applies role, status, banned and name', async () => {
    const u = await f.user({ role: 'admin', status: 'pending', banned: true, name: 'Rina' });
    const [row] = await db.select().from(user).where(eq(user.id, u.id));
    expect(row).toMatchObject({
      role: 'admin',
      approvalStatus: 'pending',
      banned: true,
      name: 'Rina',
    });
  });

  test('ids never repeat and the tracked rows are removed after the test', async () => {
    const [a, b] = [await f.user(), await f.user()];
    expect(a.id).not.toBe(b.id);
    await cleaner.flushTest();
    const rows = await db
      .select()
      .from(user)
      .where(inArray(user.id, [a.id, b.id]));
    expect(rows).toHaveLength(0);
  });
});

describe('installAuthSpies', () => {
  const spies = installAuthSpies();
  const caller = { id: `${TAG}-caller`, role: 'project_manager', name: 'Penelepon' };

  test('replaces getSession and resolveUserRole while the file runs', () => {
    expect(auth.api.getSession).not.toBe(realGetSession);
    expect(rolesMod.resolveUserRole).not.toBe(realResolveUserRole);
  });

  test('as(user) feeds the real guard, as(null) signs out', async () => {
    spies.as(caller);
    const session = await auth.api.getSession({ headers: new Headers() });
    expect(session?.user).toMatchObject({
      id: caller.id,
      role: 'project_manager',
      approvalStatus: 'approved',
      banned: false,
    });
    expect(await rolesMod.resolveUserRole({ id: 'x', email: 'x@y.z' } as never)).toBe(
      'project_manager',
    );
    const signedIn = await call('GET', '/app/whoami');
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ userId: caller.id, role: 'project_manager' });

    spies.as(null);
    expectApiError(await call('GET', '/app/whoami'), 401, 'UNAUTHORIZED');
  });

  test('a held account is answered like the guard answers it', async () => {
    spies.as({ ...caller, approvalStatus: 'pending' });
    expectApiError(await call('GET', '/app/whoami'), 403, 'ACCOUNT_PENDING');
  });

  test('impersonation is carried on the session only when asked for', async () => {
    spies.as(caller, { impersonatedBy: 'admin-1' });
    expect((await auth.api.getSession({ headers: new Headers() }))?.session).toMatchObject({
      impersonatedBy: 'admin-1',
    });
    spies.as(caller);
    expect((await auth.api.getSession({ headers: new Headers() }))?.session).toMatchObject({
      impersonatedBy: null,
    });
  });
});

describe('after installAuthSpies went out of scope', () => {
  test('afterAll gave the original getSession and resolveUserRole back', () => {
    expect(auth.api.getSession).toBe(realGetSession);
    expect(rolesMod.resolveUserRole).toBe(realResolveUserRole);
  });
});

describe('expectApiError', () => {
  const good: ApiResult = {
    status: 404,
    body: { error: 'Tidak ditemukan', code: 'NOT_FOUND', status: 404, requestId: 'abc123' },
    headers: new Headers(),
  };

  test('accepts the uniform shape', () => {
    expect(() => expectApiError(good, 404, 'NOT_FOUND')).not.toThrow();
  });

  test('rejects a wrong status, a wrong code and every missing field', () => {
    expect(() => expectApiError(good, 403, 'NOT_FOUND')).toThrow();
    expect(() => expectApiError(good, 404, 'OTHER')).toThrow();
    for (const field of ['error', 'requestId', 'status'] as const) {
      const { [field]: _omitted, ...body } = good.body;
      expect(() => expectApiError({ ...good, body }, 404, 'NOT_FOUND')).toThrow();
    }
    expect(() =>
      expectApiError({ ...good, body: { ...good.body, requestId: '' } }, 404, 'NOT_FOUND'),
    ).toThrow();
  });

  test('call() reaches the real router with or without the /api prefix', async () => {
    const withPrefix = await call('GET', '/api/no-such-route');
    const without = await call('GET', '/no-such-route');
    expectApiError(withPrefix, 404, 'NOT_FOUND');
    expectApiError(without, 404, 'NOT_FOUND');
  });
});

describe('waitForAudit', () => {
  const cleaner = createCleaner();
  afterEach(() => cleaner.flushTest());

  test('returns a row that is written after the call started', async () => {
    const action = `${TAG}.late`;
    setTimeout(async () => {
      const [row] = await db
        .insert(auditLog)
        .values({ action, targetType: 'test', summary: 'late write' })
        .returning();
      cleaner.track('audit', row.id);
    }, 60);
    const t0 = performance.now();
    const rows = await waitForAudit(eq(auditLog.action, action));
    expect(rows).toHaveLength(1);
    expect(performance.now() - t0).toBeLessThan(900);
  });

  test('gives up after about one second with [], even with the Date clock frozen', async () => {
    freezeAt(ATLAS_NOW);
    const t0 = performance.now();
    const rows = await waitForAudit(eq(auditLog.action, `${TAG}.never`));
    const waited = performance.now() - t0;
    expect(rows).toEqual([]);
    expect(waited).toBeGreaterThanOrEqual(950);
    expect(waited).toBeLessThan(2_500);
  });
});

describe('freezeAt', () => {
  test('ATLAS_NOW is Wednesday 2026-10-07 03:00 UTC', () => {
    expect(ATLAS_NOW.toISOString()).toBe('2026-10-07T03:00:00.000Z');
    expect(ATLAS_NOW.getUTCDay()).toBe(3);
  });

  test('freezes Date and Date.now at the given instant', async () => {
    freezeAt(ATLAS_NOW);
    await Bun.sleep(5);
    expect(new Date().toISOString()).toBe('2026-10-07T03:00:00.000Z');
    expect(Date.now()).toBe(ATLAS_NOW.getTime());
  });

  test('the real clock is back in the next test', () => {
    expect(Date.now()).not.toBe(ATLAS_NOW.getTime());
    expect(Math.abs(Date.now() - LOADED_AT)).toBeLessThan(10 * 60_000);
  });

  test('a second freeze in the same file is lifted as well', () => {
    freezeAt(new Date('2030-01-01T00:00:00Z'));
    expect(new Date().getUTCFullYear()).toBe(2030);
  });

  test('and the one after that sees the real clock again', () => {
    expect(Math.abs(Date.now() - LOADED_AT)).toBeLessThan(10 * 60_000);
  });
});
