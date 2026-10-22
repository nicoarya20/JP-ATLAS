/** Membership and reviewer-pool queries (S0B-10): query count, non-members, ban/approval filters, principal mapping. */
import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { db, schema } from '../../server/db';
import type { Actor } from '../../server/guard';
import { ROLES, type Role } from '../../server/permissions';
import {
  loadMembership,
  loadReviewerPool,
  toPrincipal,
} from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { createProjectFactory } from '../support/factory.project';
import { createUserFactory, type TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'membq' });
const projects = createProjectFactory(cleaner, { tag: users.tag });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

/** A second Drizzle instance on the same connection that records each SQL statement it sends. */
function countingExecutor() {
  const queries: string[] = [];
  const exec = drizzle(db.$client, {
    schema,
    logger: { logQuery: (query) => queries.push(query) },
  });
  return { exec, queries };
}

// The shared test DB may hold admins from other files; only this file's ids are asserted on.
const mine = (ids: readonly string[]) => ids.filter((id) => id.startsWith(`${users.tag}-`));

describe('loadMembership', () => {
  async function graph() {
    const lead = await users.user({ role: 'project_manager' });
    const me = await users.user();
    const p1 = await projects.project({ lead, members: [[me, 'member']] });
    const p2 = await projects.project({ lead, members: [[me, 'viewer']] });
    const p3 = await projects.project({ lead }); // `me` is not a member here
    return { lead, me, p1, p2, p3 };
  }

  it('answers three projects with exactly one query and leaves non-members out of the Map', async () => {
    const { me, p1, p2, p3 } = await graph();
    const { exec, queries } = countingExecutor();

    const found = await loadMembership(me.id, [p1.id, p2.id, p3.id], exec);

    expect(queries).toHaveLength(1);
    expect(found.size).toBe(2);
    expect(found.get(p1.id)?.role).toBe('member');
    expect(found.get(p2.id)?.role).toBe('viewer');
    expect(found.has(p3.id)).toBe(false);
  });

  it('uses project_member.created_at as joinedAt (M2)', async () => {
    const { me, p1 } = await graph();
    const [row] = await db
      .select({ createdAt: schema.projectMember.createdAt })
      .from(schema.projectMember)
      .where(eq(schema.projectMember.userId, me.id));
    const joinedAt = (await loadMembership(me.id, [p1.id])).get(p1.id)?.joinedAt;
    expect(joinedAt).toBeInstanceOf(Date);
    expect(joinedAt?.getTime()).toBe(row?.createdAt.getTime());
  });

  it('skips the database for an empty list and tolerates repeated ids', async () => {
    const { me, p1 } = await graph();
    const empty = countingExecutor();
    expect((await loadMembership(me.id, [], empty.exec)).size).toBe(0);
    expect(empty.queries).toHaveLength(0);

    const dup = countingExecutor();
    const found = await loadMembership(me.id, [p1.id, p1.id], dup.exec);
    expect(dup.queries).toHaveLength(1);
    expect([...found.keys()]).toEqual([p1.id]);
  });

  it('returns nothing for another user and for unknown project ids', async () => {
    const { p1 } = await graph();
    const stranger = await users.user();
    expect((await loadMembership(stranger.id, [p1.id, `${users.tag}-nope`])).size).toBe(0);
  });

  it('still reports membership of a trashed project so the policy can answer PROJECT_IN_TRASH', async () => {
    const { lead, p1 } = await graph();
    await db
      .update(schema.project)
      .set({ deletedAt: new Date() })
      .where(eq(schema.project.id, p1.id));
    expect((await loadMembership(lead.id, [p1.id])).get(p1.id)?.role).toBe('manager');
  });
});

describe('toPrincipal', () => {
  const ALL_ROLES: Role[] = [ROLES.MEMBER, ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

  it.each([...ALL_ROLES])('maps the %s role and is not impersonating by default', (role) => {
    expect(toPrincipal({ user: { id: 'u1' }, role })).toEqual({
      id: 'u1',
      appRole: role,
      impersonating: false,
    });
  });

  it('carries impersonatedBy from a guard Actor into impersonating', () => {
    const base = { user: { id: 'u2' }, role: ROLES.ADMIN, viaApiKey: false } as Pick<
      Actor,
      'user' | 'role' | 'viaApiKey'
    >;
    const actor = { ...base, impersonatedBy: 'sa-1' } as Actor;
    expect(toPrincipal(actor).impersonating).toBe(true);
    expect(toPrincipal({ ...actor, impersonatedBy: null } as Actor).impersonating).toBe(false);
  });

  it("reads the legacy 'user' role as member", () => {
    const legacy = { user: { id: 'u3' }, role: 'user' as unknown as Role };
    expect(toPrincipal(legacy).appRole).toBe(ROLES.MEMBER);
  });

  it('does not import guard.ts at runtime (it would form an import cycle)', async () => {
    const source = await Bun.file('server/project/membership.query.ts').text();
    expect(source).not.toMatch(/from ['"]\.\.\/guard['"]/);
  });
});

describe('loadReviewerPool', () => {
  const past = () => new Date(Date.now() - 86_400_000);
  const future = () => new Date(Date.now() + 86_400_000);

  async function ban(u: TestUser, expires: Date | null) {
    await db
      .update(schema.user)
      .set({ banned: true, banExpires: expires })
      .where(eq(schema.user.id, u.id));
  }

  it('returns managers plus only approved, unbanned Admin/Super-admin in one query', async () => {
    const lead = await users.user({ role: 'project_manager' });
    const second = await users.user({ role: 'project_manager' });
    const plain = await users.user();
    const adminOk = await users.user({ role: 'admin' });
    const superOk = await users.user({ role: 'super-admin' });
    const adminRejected = await users.user({ role: 'admin', status: 'rejected' });
    const adminPending = await users.user({ role: 'admin', status: 'pending' });
    const adminBanned = await users.user({ role: 'admin' });
    await ban(adminBanned, null);
    const adminTempBan = await users.user({ role: 'admin' });
    await ban(adminTempBan, future());
    const adminExpired = await users.user({ role: 'admin' });
    await ban(adminExpired, past());
    const project = await projects.project({
      lead,
      members: [
        [second, 'manager'],
        [plain, 'member'],
      ],
    });
    const { exec, queries } = countingExecutor();

    const pool = await loadReviewerPool(project.id, exec);

    expect(queries).toHaveLength(1);
    expect(pool.managers.map((m) => m.userId).sort()).toEqual([lead.id, second.id].sort());
    expect(pool.managers.every((m) => m.active && m.joinedAt instanceof Date)).toBe(true);
    expect(mine(pool.adminIds).sort()).toEqual([adminOk.id, superOk.id, adminExpired.id].sort());
    for (const out of [adminRejected, adminPending, adminBanned, adminTempBan, plain]) {
      expect(pool.adminIds).not.toContain(out.id);
    }
  });

  it('gives a project without Admins a pool of its managers only', async () => {
    const lead = await users.user({ role: 'project_manager' });
    const project = await projects.project({ lead });
    const pool = await loadReviewerPool(project.id);
    expect(pool.managers.map((m) => m.userId)).toEqual([lead.id]);
    expect(mine(pool.adminIds)).toEqual([]);
  });

  it('keeps a banned or unapproved manager in the list flagged inactive', async () => {
    const lead = await users.user({ role: 'project_manager' });
    const bannedMgr = await users.user({ role: 'project_manager' });
    await ban(bannedMgr, null);
    const pendingMgr = await users.user({ role: 'project_manager', status: 'pending' });
    const project = await projects.project({
      lead,
      members: [
        [bannedMgr, 'manager'],
        [pendingMgr, 'manager'],
      ],
    });
    const byId = new Map(
      (await loadReviewerPool(project.id)).managers.map((m) => [m.userId, m.active]),
    );
    expect(byId.get(lead.id)).toBe(true);
    expect(byId.get(bannedMgr.id)).toBe(false);
    expect(byId.get(pendingMgr.id)).toBe(false);
  });

  it('ignores managers of other projects and members/viewers of this one', async () => {
    const lead = await users.user({ role: 'project_manager' });
    const otherLead = await users.user({ role: 'project_manager' });
    const viewer = await users.user();
    const project = await projects.project({ lead, members: [[viewer, 'viewer']] });
    await projects.project({ lead: otherLead });
    const ids = (await loadReviewerPool(project.id)).managers.map((m) => m.userId);
    expect(ids).toEqual([lead.id]);
  });

  it('lists an Admin who also manages the project as manager and as admin', async () => {
    const admin = await users.user({ role: 'admin' });
    const project = await projects.project({ lead: admin });
    const pool = await loadReviewerPool(project.id);
    expect(pool.managers.map((m) => m.userId)).toEqual([admin.id]);
    expect(pool.adminIds).toContain(admin.id);
  });
});
