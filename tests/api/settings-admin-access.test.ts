/**
 * AD-03: the two groups this lane hands to Admin — the announcement banner (AD-05) and the sign-in
 * policy (AD-06) — write successfully as Admin, while the four boundaries the user attached to that
 * decision hold. The guard *sweep* (tests/api/settings-guard.test.ts) already proves Member and PM
 * are turned away from every row; this file proves the rest:
 *
 *  2. a self-registered default role can never be admin/super-admin, on write *and* on read;
 *  3. the technical switch next door (maintenance) stays super-admin;
 *  4. an impersonating super-admin may not post an office-wide notice or change the policy.
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import Elysia from 'elysia';
import { settingsApi } from '../../server/api/settings';
import { settingsOpsApi } from '../../server/api/settings-ops';
import { apiErrorPlugin } from '../../server/api-error';
import { db } from '../../server/db';
import { appSetting } from '../../server/db/schema';
import { ROLES } from '../../server/permissions';
import { getAccessPolicySettings } from '../../server/settings-access-policy';
import { getShellAnnouncement } from '../../server/settings-announcement';
import { invalidateSettingsCache, SINGLETON_ID, upsertSettingsRow } from '../../server/settings.core';
import { installAuthSpies } from '../support/auth';

const app = new Elysia().use(apiErrorPlugin()).use(settingsApi).use(settingsOpsApi);
const authSpies = installAuthSpies();

const ADMIN = { id: 'u-ad03-admin', email: 'ad03-admin@example.test', role: ROLES.ADMIN }; // test-only
const SUPER = { id: 'u-ad03-super', email: 'ad03-super@example.test', role: ROLES.SUPER_ADMIN }; // test-only

const send = (method: string, path: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    }),
  );

async function clearRow() {
  await db.delete(appSetting).where(eq(appSetting.id, SINGLETON_ID)).catch(() => {});
  invalidateSettingsCache();
}

afterEach(clearRow);
afterAll(clearRow);

describe('AD-05 announcement, written by Admin', () => {
  beforeEach(() => authSpies.as(ADMIN));

  test('admin posts a banner and it reaches the shell; delete clears it', async () => {
    const put = await send('PUT', '/settings/announcement', {
      text: '  Kantor libur Jumat.  ',
      level: 'warn',
      active: true,
      dismissibleUntil: null,
    });
    expect(put.status).toBe(200);
    expect(await put.json()).toEqual({
      text: 'Kantor libur Jumat.',
      level: 'warn',
      active: true,
      dismissibleUntil: null,
    });
    expect(await getShellAnnouncement()).toEqual({
      text: 'Kantor libur Jumat.',
      level: 'warn',
      dismissible: true,
    });

    const del = await send('DELETE', '/settings/announcement');
    expect(del.status).toBe(200);
    expect(await getShellAnnouncement()).toBeNull();
  });

  test('empty text is refused with a readable message, nothing shown', async () => {
    const res = await send('PUT', '/settings/announcement', {
      text: '   ',
      level: 'info',
      active: true,
      dismissibleUntil: null,
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe('VALIDATION');
    expect(body.error).toMatch(/tidak boleh kosong/);
    expect(await getShellAnnouncement()).toBeNull();
  });
});

describe('AD-06 sign-in policy, written by Admin', () => {
  beforeEach(() => authSpies.as(ADMIN));

  test('admin stores the three fields and reads them back', async () => {
    const res = await send('PUT', '/settings/access-policy', {
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 14,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 14,
    });
    const get = await send('GET', '/settings/access-policy');
    expect(await get.json()).toEqual({
      requiresApproval: false,
      defaultRole: ROLES.PROJECT_MANAGER,
      invitationTtlDays: 14,
    });
  });

  test.each([ROLES.ADMIN, ROLES.SUPER_ADMIN, 'owner'])(
    'boundary 2 (write): default role %s is refused and nothing is stored',
    async (role) => {
      const res = await send('PUT', '/settings/access-policy', {
        requiresApproval: null,
        defaultRole: role,
        invitationTtlDays: null,
      });
      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('VALIDATION');
      expect(body.error).toMatch(/tidak boleh dipakai untuk pendaftar/);
      expect((await getAccessPolicySettings()).defaultRole).toBeNull();
    },
  );

  test('boundary 2 (read): a privileged role already in the row reads back as "default"', async () => {
    // A row written by an older build or by hand — the guard loosening must not let it through.
    await upsertSettingsRow({ defaultSignupRole: ROLES.ADMIN });
    const get = await send('GET', '/settings/access-policy');
    expect((await get.json()).defaultRole).toBeNull();
  });
});

describe('boundary 3: the technical switch next door stays super-admin', () => {
  test('admin is turned away from maintenance (which this lane never loosened)', async () => {
    authSpies.as(ADMIN);
    const res = await send('PUT', '/settings/maintenance', {
      enabled: true,
      message: null,
      allowRoles: null,
    });
    expect(res.status).toBe(302); // denial, not success — see settings-guard.test.ts header
  });
});

describe('boundary 4: an impersonating super-admin is refused', () => {
  beforeEach(() => authSpies.as(SUPER, { impersonatedBy: 'u-driver' }));

  test('cannot post an announcement while impersonating', async () => {
    const res = await send('PUT', '/settings/announcement', {
      text: 'Halo',
      level: 'info',
      active: true,
      dismissibleUntil: null,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('IMPERSONATING');
    expect(await getShellAnnouncement()).toBeNull();
  });

  test('cannot change the sign-in policy while impersonating', async () => {
    const res = await send('PUT', '/settings/access-policy', {
      requiresApproval: false,
      defaultRole: null,
      invitationTtlDays: null,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('IMPERSONATING');
    expect((await getAccessPolicySettings()).requiresApproval).toBeNull();
  });
});
