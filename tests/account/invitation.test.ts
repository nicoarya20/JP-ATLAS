/** Invitation queries against the test database (S0A-04): create rules, atomic claim, and the claim wired into decideNewUser. */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { and, count, eq, gt, isNull, like, type SQL, sql } from 'drizzle-orm';
import type { Principal } from '../../server/access/user.policy';
import { claimInvitation, createInvitation } from '../../server/account/invitation.query';
import { decideNewUser, type NewUserDeps } from '../../server/account/signup-gate';
import { db } from '../../server/db';
import { user, userInvitation } from '../../server/db/schema';
import { allowedEmailDomains } from '../../server/env';

const TAG = `inv${crypto.randomUUID().slice(0, 8)}`;
const mail = (local: string) => `${TAG}-${local}@kantor.id`;
const adminId = `${TAG}-admin`;
const superId = `${TAG}-super`;
const principal = (id: string, appRole: Principal['appRole']): Principal => ({
  id,
  appRole,
  impersonating: false,
});
const ADMIN = principal(adminId, 'admin');
const SUPER = principal(superId, 'super-admin');
const NO_DOMAIN_LIMIT = { allowedDomains: new Set<string>() };

/** Deletes by the per-run TAG only, never a table-wide delete. */
const wipe = async () => {
  await db.delete(userInvitation).where(like(userInvitation.email, `%${TAG}%`));
  await db.delete(user).where(like(user.id, `${TAG}-%`));
};
const rowFor = async (email: string) =>
  (await db.select().from(userInvitation).where(eq(userInvitation.email, email)))[0];
/** Insert an invitation directly so tests can control expiry / revocation / use. */
type SeedPatch = {
  role?: string;
  expiresAt?: Date | SQL;
  acceptedAt?: Date | SQL;
  revokedAt?: Date | SQL;
};
const seed = async (email: string, patch: SeedPatch = {}) => {
  const [row] = await db
    .insert(userInvitation)
    .values({
      email,
      role: 'member',
      invitedBy: adminId,
      expiresAt: sql`now() + interval '1 day'`,
      ...patch,
    })
    .returning();
  if (!row) throw new Error('seed failed');
  return row;
};

beforeAll(async () => {
  await wipe();
  await db.insert(user).values([
    { id: adminId, name: 'Admin Uji', email: `${adminId}@test.local`, approvalStatus: 'approved' },
    { id: superId, name: 'Super Uji', email: `${superId}@test.local`, approvalStatus: 'approved' },
  ]);
});
afterAll(wipe);

describe('env allow-list', () => {
  test('ALLOWED_EMAIL_DOMAINS unset means no restriction', () => {
    // The test run never sets it; guards against a stray value hiding domain-dependent failures below.
    expect(allowedEmailDomains.size).toBe(0);
  });
});

describe('createInvitation', () => {
  test('normalizes the email, applies the role and the 14-day expiry, and records the inviter', async () => {
    const r = await createInvitation(
      { actor: ADMIN, email: `  ${TAG}-Create@Kantor.ID `, role: 'project_manager' },
      NO_DOMAIN_LIMIT,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.invitation.email).toBe(mail('create'));
    expect(r.invitation.role).toBe('project_manager');
    const row = await rowFor(mail('create'));
    expect(row?.invitedBy).toBe(adminId);
    const days = ((row?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);
  });

  test("' Budi@Kantor.ID ' then 'budi@kantor.id' => 409 INVITATION_EXISTS", async () => {
    const first = await createInvitation(
      { actor: ADMIN, email: ` ${TAG}-Budi@Kantor.ID `, role: 'member' },
      NO_DOMAIN_LIMIT,
    );
    expect(first.ok).toBe(true);
    const second = await createInvitation(
      { actor: ADMIN, email: mail('budi'), role: 'member' },
      NO_DOMAIN_LIMIT,
    );
    expect(second).toMatchObject({ ok: false, code: 'INVITATION_EXISTS', http: 409 });
  });

  test('Admin cannot invite admin (403), Super-admin can, member cannot invite at all', async () => {
    const byAdmin = await createInvitation(
      { actor: ADMIN, email: mail('adm1'), role: 'admin' },
      NO_DOMAIN_LIMIT,
    );
    expect(byAdmin).toMatchObject({ ok: false, code: 'TARGET_PROTECTED', http: 403 });
    expect(await rowFor(mail('adm1'))).toBeUndefined();

    const bySuper = await createInvitation(
      { actor: SUPER, email: mail('adm2'), role: 'admin' },
      NO_DOMAIN_LIMIT,
    );
    expect(bySuper.ok).toBe(true);

    const byMember = await createInvitation(
      { actor: principal('someone', 'member'), email: mail('adm3'), role: 'member' },
      NO_DOMAIN_LIMIT,
    );
    expect(byMember).toMatchObject({ ok: false, code: 'NOT_ADMIN', http: 403 });
  });

  test('super-admin is never invitable, even by a super-admin', async () => {
    const r = await createInvitation(
      { actor: SUPER, email: mail('sa'), role: 'super-admin' },
      NO_DOMAIN_LIMIT,
    );
    expect(r).toMatchObject({ ok: false, code: 'TARGET_PROTECTED' });
  });

  test.each([
    'büdi@kantor.id',
    'budi@kantör.id',
    'İlker@kantor.id',
    'budi kantor@kantor.id',
    'bukan-email',
    '',
  ])('invalid or non-ASCII email %p => 422 INVALID_EMAIL, not a 500', async (email) => {
    const r = await createInvitation({ actor: ADMIN, email, role: 'member' }, NO_DOMAIN_LIMIT);
    expect(r).toMatchObject({ ok: false, code: 'INVALID_EMAIL', http: 422 });
  });

  test('a domain outside the allow-list => 422 DOMAIN_NOT_ALLOWED and nothing is stored', async () => {
    const r = await createInvitation(
      { actor: ADMIN, email: `${TAG}-out@evil.com`, role: 'member' },
      { allowedDomains: new Set(['kantor.id']) },
    );
    expect(r).toMatchObject({ ok: false, code: 'DOMAIN_NOT_ALLOWED', http: 422 });
    expect(await rowFor(`${TAG}-out@evil.com`)).toBeUndefined();
  });

  test('stops at the active-invitation cap and counts only live rows', async () => {
    const [before] = await db
      .select({ n: count() })
      .from(userInvitation)
      .where(
        and(
          isNull(userInvitation.acceptedAt),
          isNull(userInvitation.revokedAt),
          gt(userInvitation.expiresAt, sql`now()`),
        ),
      );
    const live = before?.n ?? 0;
    const full = await createInvitation(
      { actor: ADMIN, email: mail('cap1'), role: 'member' },
      { ...NO_DOMAIN_LIMIT, maxActive: live },
    );
    expect(full).toMatchObject({ ok: false, code: 'INVITATION_LIMIT', http: 409 });
    const room = await createInvitation(
      { actor: ADMIN, email: mail('cap2'), role: 'member' },
      { ...NO_DOMAIN_LIMIT, maxActive: live + 1 },
    );
    expect(room.ok).toBe(true);
  });

  test('an expired invitation is revoked so the same email can be invited again', async () => {
    const stale = await seed(mail('stale'), { expiresAt: sql`now() - interval '1 hour'` });
    const r = await createInvitation(
      { actor: ADMIN, email: mail('stale'), role: 'member' },
      NO_DOMAIN_LIMIT,
    );
    expect(r.ok).toBe(true);
    const old = (await db.select().from(userInvitation).where(eq(userInvitation.id, stale.id)))[0];
    expect(old?.revokedAt).not.toBeNull();
  });

  test('revoked and used invitations do not block a new one', async () => {
    await seed(mail('revoked'), { revokedAt: sql`now()` });
    await seed(mail('used'), { acceptedAt: sql`now()` });
    for (const local of ['revoked', 'used']) {
      const r = await createInvitation(
        { actor: ADMIN, email: mail(local), role: 'member' },
        NO_DOMAIN_LIMIT,
      );
      expect(r.ok).toBe(true);
    }
  });

  test('two simultaneous invites for one email => exactly one succeeds', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        createInvitation({ actor: ADMIN, email: mail('race'), role: 'member' }, NO_DOMAIN_LIMIT),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ code: 'INVITATION_EXISTS' });
  });
});

describe('claimInvitation', () => {
  test('returns the role, id and inviter once, then null', async () => {
    const inv = await seed(mail('claim'), { role: 'project_manager' });
    expect(await claimInvitation(mail('claim'))).toEqual({
      id: inv.id,
      role: 'project_manager',
      invitedBy: adminId,
    });
    expect(await claimInvitation(mail('claim'))).toBeNull();
    expect((await rowFor(mail('claim')))?.acceptedAt).not.toBeNull();
  });

  test('simultaneous claims (Promise.all) => exactly one non-null', async () => {
    await seed(mail('claimrace'));
    const results = await Promise.all(
      Array.from({ length: 8 }, () => claimInvitation(mail('claimrace'))),
    );
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  test('expired, revoked and already-used invitations cannot be claimed', async () => {
    await seed(mail('c-exp'), { expiresAt: sql`now() - interval '1 second'` });
    await seed(mail('c-rev'), { revokedAt: sql`now()` });
    await seed(mail('c-used'), { acceptedAt: sql`now()` });
    for (const local of ['c-exp', 'c-rev', 'c-used']) {
      expect(await claimInvitation(mail(local))).toBeNull();
    }
  });

  test('only an exact normalized match claims', async () => {
    await seed(mail('exact'));
    expect(await claimInvitation(`  ${mail('exact')}  `)).toBeNull();
    expect(await claimInvitation(mail('exact').toUpperCase())).toBeNull();
    expect(await claimInvitation(mail('exact'))).not.toBeNull();
  });
});

describe('decideNewUser with the real claim', () => {
  const deps = (): NewUserDeps => ({
    isProd: true,
    superAdminEmails: new Set(),
    allowedDomains: new Set(),
    claimInvitation,
  });
  const google = (email: string, emailVerified = true) => ({
    email,
    emailVerified,
    viaEmailSignUp: false,
  });

  test('verified + invitation => approved with the invited role, invitation consumed', async () => {
    const inv = await seed(mail('d-ok'), { role: 'project_manager' });
    const r = await decideNewUser(google(` ${mail('d-ok').toUpperCase()} `), deps());
    expect(r).toMatchObject({
      allow: true,
      invitationId: inv.id,
      data: { approvalStatus: 'approved', role: 'project_manager', approvalDecidedBy: adminId },
    });
    expect((await rowFor(mail('d-ok')))?.acceptedAt).not.toBeNull();
  });

  test('emailVerified=false + invitation => pending and the invitation stays usable', async () => {
    await seed(mail('d-unv'));
    const r = await decideNewUser(google(mail('d-unv'), false), deps());
    expect(r).toMatchObject({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
    expect((await rowFor(mail('d-unv')))?.acceptedAt).toBeNull();
    expect(await claimInvitation(mail('d-unv'))).not.toBeNull();
  });

  test('expired, revoked or used invitations => pending', async () => {
    await seed(mail('d-exp'), { expiresAt: sql`now() - interval '1 second'` });
    await seed(mail('d-rev'), { revokedAt: sql`now()` });
    await seed(mail('d-used'), { acceptedAt: sql`now()` });
    for (const local of ['d-exp', 'd-rev', 'd-used']) {
      const r = await decideNewUser(google(mail(local)), deps());
      expect(r).toMatchObject({ allow: true, data: { approvalStatus: 'pending' } });
    }
  });

  test('two sign-ups racing for one invitation => only one is approved', async () => {
    await seed(mail('d-race'), { role: 'admin' });
    const rs = await Promise.all([
      decideNewUser(google(mail('d-race')), deps()),
      decideNewUser(google(mail('d-race')), deps()),
    ]);
    const statuses = rs.map((r) => (r.allow ? r.data.approvalStatus : 'denied')).sort();
    expect(statuses).toEqual(['approved', 'pending']);
  });

  test('super-admin env email is approved without needing an invitation row', async () => {
    const r = await decideNewUser(google(mail('boss')), {
      ...deps(),
      superAdminEmails: new Set([mail('boss')]),
    });
    expect(r).toMatchObject({
      allow: true,
      data: { approvalStatus: 'approved', role: 'super-admin' },
    });
  });
});
