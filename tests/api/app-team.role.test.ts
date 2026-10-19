/**
 * `accountRole` on `GET /api/app/team/:userId` (S6 tim-a): the stored account role reaches Admin and
 * Super-admin only. For everyone else the key is absent from the raw body — not `null`, not a
 * default — so a leak is a visible key. The list never carries it.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { user } from '../../server/db/schema';
import type { Role } from '../../server/permissions';
import { call, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'teamrole' });
beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
  freezeAt(ATLAS_NOW);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const BASE = '/app/team';
const ACCOUNT_ROLES: Role[] = ['member', 'project_manager', 'admin', 'super-admin'];
const marker = () => `m${crypto.randomUUID().slice(0, 8)}`;

async function detail(who: TestUser, target: TestUser): Promise<Json> {
  auth.as(who);
  const res = await call('GET', `${BASE}/${target.id}`);
  expect(res.status).toBe(200);
  return res.body;
}

/** Everyone who may open `target` as a colleague shares project X with them; Eka manages X. */
async function graph(targetRole: Role) {
  const mk = marker();
  const eka = await f.user({ role: 'project_manager', name: `${mk} Eka` });
  const awan = await f.user({ name: `${mk} Awan` });
  const dedi = await f.user({ role: 'project_manager', name: `${mk} Dedi` });
  const target = await f.user({ role: targetRole, name: `${mk} Target` });
  const x = await f.project({
    lead: eka,
    members: [
      [awan, 'member'],
      [dedi, 'member'],
      [target, 'member'],
    ],
    name: `${mk} X`,
  });
  return { mk, eka, awan, dedi, target, x };
}

describe('accountRole is shown to Admin and Super-admin', () => {
  it.each(ACCOUNT_ROLES)('tells an Admin the stored role %s', async (role) => {
    const g = await graph(role);
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect((await detail(admin, g.target)).accountRole).toBe(role);
  });

  it.each(ACCOUNT_ROLES)('tells a Super-admin the stored role %s', async (role) => {
    const g = await graph(role);
    const root = await f.user({ role: 'super-admin', name: `${g.mk} Zroot` });
    expect((await detail(root, g.target)).accountRole).toBe(role);
  });

  it('reads the legacy stored value "user" as member, like the user directory', async () => {
    const g = await graph('member');
    await db.update(user).set({ role: 'user' }).where(eq(user.id, g.target.id));
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect((await detail(admin, g.target)).accountRole).toBe('member');
  });

  it('tells an Admin about their own role too', async () => {
    const g = await graph('member');
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect((await detail(admin, admin)).accountRole).toBe('admin');
  });

  it('shows it to an Admin who opens a banned account', async () => {
    const g = await graph('member');
    const banned = await f.user({ banned: true, role: 'project_manager', name: `${g.mk} Banned` });
    const admin = await f.user({ role: 'admin', name: `${g.mk} Zadmin` });
    expect((await detail(admin, banned)).accountRole).toBe('project_manager');
  });
});

describe('accountRole is absent for everyone else', () => {
  it('leaves the key out for a Member, a Project Manager and a project manager (Pengelola)', async () => {
    const g = await graph('admin');
    for (const viewer of [g.awan, g.dedi, g.eka]) {
      const body = await detail(viewer, g.target);
      expect('accountRole' in body).toBe(false);
      expect(JSON.stringify(body)).not.toContain('accountRole');
      expect(JSON.stringify(body)).not.toContain('super-admin');
    }
  });

  it('leaves it out when a person opens themselves, whatever their role', async () => {
    for (const role of ['member', 'project_manager'] as const) {
      const g = await graph(role);
      const body = await detail(g.target, g.target);
      expect('accountRole' in body).toBe(false);
    }
  });

  it('never adds it to the list rows', async () => {
    const g = await graph('admin');
    auth.as(await f.user({ role: 'admin', name: `${g.mk} Zadmin` }));
    const res = await call('GET', `${BASE}?q=${g.mk}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('accountRole');
  });
});
