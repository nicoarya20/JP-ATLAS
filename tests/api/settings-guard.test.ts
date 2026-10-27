/**
 * Guard sweep for every /api/settings endpoint (P13 RD-02, AD-03, §9 R2). Three groups are an
 * Admin's to write — `PUT /settings/branding` (RD-02), the announcement banner and the sign-in
 * policy (AD-03) — so this file is the proof that nothing *else* moved with them: the route table
 * is swept, every row declares the roles allowed to call it, and every other role is checked to be
 * turned away without the row being touched. The technical switches (rate-limit, retention,
 * features, maintenance) stay super-admin, which is the boundary AD-03 promised to keep.
 *
 * Adding a settings endpoint means adding its row to ALLOWED below, or this suite goes red — a
 * new write must state who may call it instead of inheriting the sweep silently.
 *
 * ⚠️ The 302s asserted below are the CURRENT state, not the contract we want. Denial here is a
 * redirect to the caller's own home instead of the uniform JSON 403, because `requireRole` /
 * `requireAnyRole` (`server/guard.ts:28-29`) are the page-loader guards and ten API files have
 * always used them — `analytics`, `analytics-visits`, `analytics-ratelimits`, `api-keys`,
 * `file-health`, `logs`, `ops`, `settings`, `settings-access`, `settings-ops`. Fixing that shape
 * belongs to a `fix` branch of its own (recorded as debt, user decision 23 Oct 2026); it may not
 * ride along in a diff that widens a permission. So read every `toBe(302)` below as "today's
 * denial", expect it to become a JSON 403 when that debt is paid, and do not conclude from this
 * file that redirecting an API caller is right. What the sweep really guards is the escalation
 * risk, and that part is the contract: the call never succeeds and nothing is written.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import Elysia from 'elysia';
import { settingsApi } from '../../server/api/settings';
import { settingsOpsApi } from '../../server/api/settings-ops';
import { apiErrorPlugin } from '../../server/api-error';
import { requiredScope, roleAllowsScope } from '../../server/api-keys/scopes';
import { db } from '../../server/db';
import { appSetting } from '../../server/db/schema';
import { homeFor, ROLES } from '../../server/permissions';
import { invalidateSettingsCache } from '../../server/settings.core';
import { getBranding } from '../../server/settings-branding';
import { installAuthSpies } from '../support/auth';

// The real error plugin and the real guards run; only the session and role lookups are spied,
// because replacing the guard module leaks into unrelated files of the same run.
const app = new Elysia().use(apiErrorPlugin()).use(settingsApi).use(settingsOpsApi);
const authSpies = installAuthSpies();

const EVERY_ROLE = Object.values(ROLES);
const SUPER_ADMIN_ONLY = [ROLES.SUPER_ADMIN];

/** A valid body per route, so schema validation can never answer before the guard does. */
const BODY: Record<string, unknown> = {
  'PUT /settings/': { emailAuthEnabled: false, signupEnabled: true },
  'PUT /settings/rate-limit': { rateLimitEnabled: true },
  'PUT /settings/retention': {
    visitDays: null,
    loginDays: null,
    rateLimitDays: null,
    auditDays: null,
    apiUsageDays: null,
  },
  'PUT /settings/features': { flags: [] },
  'PUT /settings/branding': { appName: null, appTagline: null, supportUrl: null },
  'PUT /settings/maintenance': { enabled: false, message: null, allowRoles: null },
  'PUT /settings/announcement': {
    text: 'Halo',
    level: 'info',
    active: false,
    dismissibleUntil: null,
  },
  'PUT /settings/access-policy': {
    requiresApproval: null,
    defaultRole: null,
    invitationTtlDays: null,
  },
};

/**
 * Who may call each settings route. `null` = public (the login page reads it without a session).
 * Branding is the one row RD-02 widened; §3 D5 keeps `features` super-admin on purpose, and the
 * rate-limit / retention / maintenance rows are the ones the plan forbids touching.
 */
const ALLOWED: Record<string, readonly string[] | null> = {
  'GET /settings/': null,
  'GET /settings/all': SUPER_ADMIN_ONLY,
  'PUT /settings/': SUPER_ADMIN_ONLY,
  'PUT /settings/rate-limit': SUPER_ADMIN_ONLY,
  'DELETE /settings/rate-limit': SUPER_ADMIN_ONLY,
  'PUT /settings/retention': SUPER_ADMIN_ONLY,
  'POST /settings/retention/run': SUPER_ADMIN_ONLY,
  'PUT /settings/features': SUPER_ADMIN_ONLY,
  'PUT /settings/branding': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'PUT /settings/maintenance': SUPER_ADMIN_ONLY,
  'GET /settings/announcement': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'PUT /settings/announcement': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'DELETE /settings/announcement': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'GET /settings/access-policy': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  'PUT /settings/access-policy': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
};

type Row = { method: string; path: string };
const labelOf = (r: Row) => `${r.method} ${r.path}`;
const ROUTES: string[] = [...settingsApi.routes, ...settingsOpsApi.routes]
  .map((r) => r as Row)
  .filter((r) => r.method !== 'HEAD' && r.method !== 'OPTIONS')
  .map(labelOf)
  .sort();

async function call(label: string) {
  const [method, path] = label.split(' ');
  const body = BODY[label];
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A 302 must be observable, not followed into the HTML it points at.
      redirect: 'manual',
    }),
  );
  return { status: res.status, location: res.headers.get('location') };
}

/** Every route × every role that may not call it. */
const DENIED: Array<{ label: string; role: string }> = ROUTES.flatMap((label) => {
  const allowed = ALLOWED[label];
  if (!allowed) return [];
  return EVERY_ROLE.filter((r) => !allowed.includes(r)).map((role) => ({ label, role }));
});

async function clearSettingsRow() {
  await db
    .delete(appSetting)
    .where(eq(appSetting.id, 'singleton'))
    .catch(() => {});
  invalidateSettingsCache();
}

beforeEach(() => authSpies.as(null));
afterAll(clearSettingsRow);

describe('/api/settings guard sweep', () => {
  test('the route table is exactly the table ALLOWED describes (a vacuous sweep must fail)', () => {
    expect(ROUTES).toEqual(Object.keys(ALLOWED).sort());
    expect(DENIED.length).toBeGreaterThan(20);
  });

  test.each(DENIED)('$label: $role is turned away', async ({ label, role }) => {
    authSpies.as({ id: `u-${role}`, role });
    const { status, location } = await call(label);
    // 302 is today's denial shape, not the one we want — see the file header before copying it.
    expect(status).toBe(302);
    expect(location).toBe(homeFor(role));
  });

  test.each(ROUTES.filter((l) => ALLOWED[l] !== null))(
    '%s: an anonymous caller is sent to /login',
    async (label) => {
      const { status, location } = await call(label);
      expect(status).toBe(302);
      expect(location).toBe('/login');
    },
  );
});

describe('RD-02 stays on the cookie path: an API key cannot carry it', () => {
  test('settings:write is still super-admin-only, so an Admin key may not write branding', () => {
    // One scope covers all of /api/settings, so widening it would hand an Admin far more than
    // branding. RD-02 therefore moves the session guard only; `scopes.ts` is left alone.
    expect(requiredScope('PUT', '/api/settings/branding')).toBe('settings:write');
    expect(roleAllowsScope(ROLES.ADMIN, 'settings:write')).toBe(false);
    expect(roleAllowsScope(ROLES.SUPER_ADMIN, 'settings:write')).toBe(true);
  });
});

describe('RD-02: branding is the only settings group Admin may write', () => {
  const ADMIN = { id: 'u-rd02-admin', email: 'rd02-admin@example.test', role: ROLES.ADMIN }; // test-only
  const put = (path: string, body: unknown) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'manual',
      }),
    );

  beforeEach(() => authSpies.as(ADMIN));
  afterAll(clearSettingsRow);

  test('admin writes branding and the new name becomes the effective one', async () => {
    const res = await put('/settings/branding', {
      appName: '  Koperasi Maju  ',
      appTagline: null,
      supportUrl: null,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ appName: 'Koperasi Maju', appTagline: null });
    invalidateSettingsCache();
    expect((await getBranding()).appName).toBe('Koperasi Maju');
  });

  test('admin may not write feature flags (§3 D5) and no flag is stored', async () => {
    const res = await put('/settings/features', {
      flags: [{ key: 'trash', enabled: false, description: 'dimatikan admin' }],
    });
    expect(res.status).toBe(302);
    invalidateSettingsCache();
    const [row] = await db.select().from(appSetting).where(eq(appSetting.id, 'singleton')).limit(1);
    expect(row?.featureFlags ?? null).toBeNull();
  });

  test.each([
    ['/settings/', { emailAuthEnabled: true, signupEnabled: false }],
    ['/settings/rate-limit', { rateLimitEnabled: false }],
    [
      '/settings/retention',
      { visitDays: 1, loginDays: null, rateLimitDays: null, auditDays: null, apiUsageDays: null },
    ],
    ['/settings/maintenance', { enabled: true, message: 'x', allowRoles: null }],
  ] as const)('admin stays locked out of %s', async (path, body) => {
    const res = await put(path, body);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(homeFor(ROLES.ADMIN));
  });
});
