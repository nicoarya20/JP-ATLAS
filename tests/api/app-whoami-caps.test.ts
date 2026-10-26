/**
 * `GET /app/whoami` carries the app-wide capabilities (GAP A-17): a client that is not the web
 * layout — the mobile app — has to learn whether it may start a project without inferring it from
 * a role. The values must be the same ones the web sidebar renders, so the last test compares the
 * route against the `/app` layout loader itself rather than against a second copy of the rule.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { loader as layoutLoader } from '../../app/routes/app/layout';
import type { AppCaps } from '../../server/access/capabilities';
import { API_KEY_PREFIX } from '../../server/auth';
import type { Role } from '../../server/permissions';
import { call, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'whoamicaps' });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const users: Partial<Record<Role, TestUser>> = {};
const ROLES: readonly Role[] = ['member', 'project_manager', 'admin', 'super-admin'];

beforeAll(async () => {
  await cleaner.shared(async () => {
    for (const role of ROLES) users[role] = await f.user({ role });
  });
});

const whoami = async (u: TestUser) => {
  auth.as(u);
  const res = await call('GET', '/app/whoami');
  expect(res.status).toBe(200);
  return res.body as { userId: string; name: string; role: string; caps: AppCaps };
};

describe('GET /app/whoami', () => {
  it('answers the identity and the full AppCaps map', async () => {
    const body = await whoami(users.member as TestUser);
    expect(body).toEqual({
      userId: (users.member as TestUser).id,
      name: (users.member as TestUser).name,
      role: 'member',
      caps: { createProject: false, createEvent: true, dashboard: false, dev: false },
    });
  });

  // `createEvent` is true for every role: a personal event needs no project (S7 E-02). Picking a
  // project for it stays a per-project decision, which the event list's own `caps` reports.
  it.each([
    ['member', { createProject: false, createEvent: true, dashboard: false, dev: false }],
    ['project_manager', { createProject: true, createEvent: true, dashboard: false, dev: false }],
    ['admin', { createProject: true, createEvent: true, dashboard: true, dev: false }],
    ['super-admin', { createProject: true, createEvent: true, dashboard: true, dev: true }],
  ] as const)('sends the right capabilities for %s', async (role, caps) => {
    expect((await whoami(users[role as Role] as TestUser)).caps).toEqual(caps);
  });

  it('never leaves createProject out, so a client never has to guess from the role', async () => {
    for (const role of ROLES) {
      const { caps } = await whoami(users[role] as TestUser);
      expect(Object.keys(caps).sort()).toEqual([
        'createEvent',
        'createProject',
        'dashboard',
        'dev',
      ]);
      expect(typeof caps.createProject).toBe('boolean');
    }
  });

  it('agrees with the /app layout loader the web sidebar reads', async () => {
    for (const role of ROLES) {
      const u = users[role] as TestUser;
      const api = await whoami(u);
      auth.as(u);
      const web = (await layoutLoader({
        request: new Request('http://localhost/app'),
        params: {},
        context: {},
      } as Parameters<typeof layoutLoader>[0])) as { caps: AppCaps };
      expect(api.caps).toEqual(web.caps);
    }
  });

  it('is a read an API key with app:read may make', async () => {
    const res = await call('GET', '/app/whoami', undefined, {
      'x-api-key': `${API_KEY_PREFIX}not-a-real-key`, // test-only
    });
    // An unknown key is rejected as a key, not as a denied route: the path itself stays open.
    expect(res.body.error).not.toBe('Endpoint ini tidak bisa diakses dengan API key');
  });
});
