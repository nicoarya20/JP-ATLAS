/** Sign-up hooks (S0A-06): the real `databaseHooks.user.create` run through Better Auth's internalAdapter on the test DB. */
import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { eq, like } from 'drizzle-orm';
import { actionMeta, TARGET_LABELS } from '../../app/lib/audit-api';
import * as invitationQuery from '../../server/account/invitation.query';
import type { NewUserDeps } from '../../server/account/signup-gate';
import {
  afterCreateUser,
  beforeCreateUser,
  type SignupHookContext,
} from '../../server/account/signup-hooks';
import { AUDIT_ACTIONS } from '../../server/audit';
import { auth } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, profile, user, userInvitation } from '../../server/db/schema';
import { allowedEmailDomains, superAdminEmails } from '../../server/env';
import { logger } from '../../server/logger';

const TAG = `sh${crypto.randomUUID().slice(0, 8)}`;
const mail = (local: string, domain = 'kantor.id') => `${TAG}-${local}@${domain}`;
const adminId = `${TAG}-admin`;
const saEmails = superAdminEmails as Set<string>; // mutable at runtime; restored in afterEach
const domains = allowedEmailDomains as Set<string>;

/** Deletes by the per-run TAG only, never a table-wide delete. */
const wipe = async () => {
  const invs = await db
    .select({ id: userInvitation.id })
    .from(userInvitation)
    .where(like(userInvitation.email, `%${TAG}%`));
  for (const { id } of invs) await db.delete(auditLog).where(eq(auditLog.targetId, id));
  await db.delete(userInvitation).where(like(userInvitation.email, `%${TAG}%`));
  await db.delete(user).where(like(user.email, `%${TAG}%`));
  await db.delete(user).where(like(user.id, `${TAG}-%`));
};

/** Run the real hooks: createUser goes through `createWithHooks` exactly like an OAuth first login. */
const signUp = async (email: string, emailVerified = true) => {
  const { internalAdapter } = await auth.$context;
  return internalAdapter.createUser(
    { email, emailVerified, name: 'Pengguna Uji' },
    // Same provisioning source the Google callback passes.
    { method: 'oauth', oauth: { providerId: 'google' } },
  );
};
const rowFor = async (email: string) =>
  (await db.select().from(user).where(eq(user.email, email)))[0];
const invite = async (email: string, role = 'project_manager') => {
  const [row] = await db
    .insert(userInvitation)
    .values({
      email,
      role,
      invitedBy: adminId,
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    .returning();
  if (!row) throw new Error('seed failed');
  return row;
};

beforeAll(async () => {
  await wipe();
  await db.insert(user).values({
    id: adminId,
    name: 'Admin Uji',
    email: `${adminId}@test.local`,
    approvalStatus: 'approved',
  });
});
afterEach(() => {
  saEmails.clear();
  domains.clear();
});
afterAll(wipe);

describe('create.before through the real auth instance', () => {
  test('verified email with a live invitation is approved with the invited role', async () => {
    const email = mail('invited');
    const inv = await invite(email);
    const created = await signUp(email);
    expect(created).not.toBeNull();

    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('approved');
    expect(row?.role).toBe('project_manager');
    expect(row?.approvalDecidedBy).toBe(adminId);
    expect(row?.approvalDecidedAt).toBeInstanceOf(Date);

    // create.after is queued; give it a tick, then check every follow-up.
    await Bun.sleep(50);
    const [prof] = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, row?.id ?? ''));
    expect(prof?.textSize).toBe('normal');
    const [after] = await db.select().from(userInvitation).where(eq(userInvitation.id, inv.id));
    expect(after?.acceptedUserId).toBe(row?.id ?? null);
    expect(after?.acceptedAt).toBeInstanceOf(Date);
    const [log] = await db.select().from(auditLog).where(eq(auditLog.targetId, inv.id));
    expect(log?.action).toBe(AUDIT_ACTIONS.INVITATION_USE);
    expect(log?.actorId).toBe(row?.id ?? null);
    expect(log?.targetType).toBe('invitation');
    expect(JSON.stringify(log?.meta)).toContain('project_manager');
  });

  test('without an invitation the account is pending/member and still gets a profile', async () => {
    const email = mail('plain');
    await signUp(email);
    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('pending');
    expect(row?.role).toBe('member');
    expect(row?.approvalDecidedBy).toBeNull();
    await Bun.sleep(50);
    expect(
      await db
        .select()
        .from(profile)
        .where(eq(profile.userId, row?.id ?? '')),
    ).toHaveLength(1);
  });

  test('an unverified address never claims the invitation (C-AUTH-8)', async () => {
    const email = mail('unverified');
    const inv = await invite(email);
    await signUp(email, false);
    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('pending');
    expect(row?.role).toBe('member');
    const [after] = await db.select().from(userInvitation).where(eq(userInvitation.id, inv.id));
    expect(after?.acceptedAt).toBeNull();
  });

  test('a verified env super-admin is approved as super-admin on the very first login', async () => {
    // The hook reads no other user row, so an empty user table behaves the same as this one.
    const email = mail('boss');
    saEmails.add(email);
    await signUp(email);
    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('approved');
    expect(row?.role).toBe('super-admin');
    expect(row?.approvalDecidedAt).toBeInstanceOf(Date);
  });

  test('an unverified env super-admin address is not promoted', async () => {
    const email = mail('boss-unverified');
    saEmails.add(email);
    await signUp(email, false);
    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('pending');
    expect(row?.role).toBe('member');
  });

  test('a forbidden domain creates no user row, even with an invitation', async () => {
    domains.add('kantor.id');
    const email = mail('outsider', 'luar.com');
    await invite(email);
    const created = await signUp(email);
    expect(created).toBeNull();
    expect(await rowFor(email)).toBeUndefined();
  });

  test('a failing invitation claim holds the account as pending, never approved', async () => {
    const email = mail('dbfail');
    await invite(email);
    const spy = spyOn(invitationQuery, 'claimInvitation').mockRejectedValue(
      Object.assign(new Error(`connection lost for ${email}`), { code: '57P01' }),
    );
    const warn = spyOn(logger, 'warn');
    try {
      await signUp(email);
    } finally {
      spy.mockRestore();
    }
    const row = await rowFor(email);
    expect(row?.approvalStatus).toBe('pending');
    expect(row?.role).toBe('member');
    // The driver message (which echoes the email) must not reach the log.
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TAG);
    warn.mockRestore();
  });
});

describe('beforeCreateUser with injected policy', () => {
  const policy = (over: Partial<NewUserDeps>): (() => Promise<NewUserDeps>) => {
    const base: NewUserDeps = {
      isProd: false,
      superAdminEmails: new Set(),
      allowedDomains: new Set(),
      claimInvitation: async () => null,
    };
    return async () => ({ ...base, ...over });
  };
  const emailCtx: SignupHookContext = { path: '/sign-up/email' };

  test('production refuses the email sign-up endpoint', async () => {
    const r = await beforeCreateUser(
      { email: 'a@kantor.id', emailVerified: false },
      emailCtx,
      policy({ isProd: true }),
    );
    expect(r).toBe(false);
  });

  test('outside production an email sign-up is marked verified (K-2)', async () => {
    const r = await beforeCreateUser(
      { email: 'a@kantor.id', emailVerified: false },
      emailCtx,
      policy({ superAdminEmails: new Set(['a@kantor.id']) }),
    );
    expect(r).toMatchObject({
      data: { approvalStatus: 'approved', role: 'super-admin', emailVerified: true },
    });
  });

  test('an unexpected failure while loading the policy yields pending/member', async () => {
    const warn = spyOn(logger, 'warn');
    const r = await beforeCreateUser(
      { email: 'a@kantor.id', emailVerified: true },
      null,
      async () => {
        throw new Error('boom a@kantor.id');
      },
    );
    expect(r).toEqual({ data: { approvalStatus: 'pending', role: 'member' } });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('a@kantor.id');
    warn.mockRestore();
  });
});

describe('afterCreateUser is soft', () => {
  test('a failing follow-up is logged with the user id only and does not throw', async () => {
    const warn = spyOn(logger, 'warn');
    const ghost = { id: `${TAG}-ghost`, email: mail('ghost') }; // no user row → profile FK violation
    await expect(afterCreateUser(ghost, null)).resolves.toBeUndefined();
    const logged = JSON.stringify(warn.mock.calls.map((c) => c[0]));
    expect(logged).toContain(ghost.id);
    expect(logged).not.toContain(ghost.email);
    warn.mockRestore();
  });
});

describe('audit dictionary and import hygiene', () => {
  test('every AUDIT_ACTIONS value has an ACTION_META entry (C-LOG-3)', () => {
    for (const action of Object.values(AUDIT_ACTIONS)) {
      expect(actionMeta(action).label).not.toBe(action);
    }
    expect(actionMeta('user.approve')).toEqual({ label: 'Setujui user', color: 'teal' });
    expect(actionMeta('invitation.use')).toEqual({ label: 'Undangan dipakai', color: 'teal' });
    expect(TARGET_LABELS.invitation).toBe('Undangan');
  });

  test('signup-hooks never imports server/auth or env at the top level', async () => {
    const src = await Bun.file(
      new URL('../../server/account/signup-hooks.ts', import.meta.url),
    ).text();
    const staticImports = [...src.matchAll(/^import[^;]*from '([^']+)'/gms)].map((m) => m[1]);
    expect(staticImports.length).toBeGreaterThan(0);
    for (const spec of staticImports) {
      expect(spec).not.toMatch(/(^|\/)auth$/);
      expect(spec).not.toMatch(/(^|\/)env$/);
    }
  });
});
