/** Pure sign-up decision (S0A-04): domain gate, production email sign-up gate, super-admin, invitation claim, fail-closed. */
import { afterEach, describe, expect, test } from 'bun:test';
import {
  type ClaimedInvitation,
  decideNewUser,
  emailDomain,
  isDomainAllowed,
  isInvitableEmail,
  type NewUserDeps,
  normalizeEmail,
  parseEmailDomains,
} from '../../server/account/signup-gate';
import { registerProcessLogger } from '../../server/ssr-log';

const INVITE: ClaimedInvitation = { id: 'inv-1', role: 'project_manager', invitedBy: 'admin-1' };

/** Deps with a counting claim stub; `claimed` is the invitation the stub hands out (null = none). */
function deps(overrides: Partial<NewUserDeps> = {}, claimed: ClaimedInvitation | null = null) {
  const calls: string[] = [];
  const base: NewUserDeps = {
    isProd: true,
    superAdminEmails: new Set(),
    allowedDomains: new Set(),
    claimInvitation: async (email) => {
      calls.push(email);
      return claimed;
    },
  };
  return { deps: { ...base, ...overrides }, calls };
}
const googleSignUp = (email: string, emailVerified = true) => ({
  email,
  emailVerified,
  viaEmailSignUp: false,
});

afterEach(() => registerProcessLogger(null));

describe('email helpers', () => {
  test('normalizeEmail trims and lower-cases', () => {
    expect(normalizeEmail(' Budi@Kantor.ID ')).toBe('budi@kantor.id');
  });

  test('emailDomain takes the text after the last @', () => {
    expect(emailDomain('a@b@Kantor.ID')).toBe('kantor.id');
    expect(emailDomain('no-at-sign')).toBe('');
  });

  test.each([
    ['', 'x@any.com', true],
    ['kantor.id', 'x@kantor.id', true],
    ['kantor.id', 'x@KANTOR.ID', true],
    ['kantor.id', 'x@evil.com', false],
    ['kantor.id', 'x@sub.kantor.id', false],
    ['kantor.id', 'x@kantor.id.evil.com', false],
  ])('isDomainAllowed(list=%p, %p) = %p', (list, email, expected) => {
    expect(isDomainAllowed(email, parseEmailDomains(list))).toBe(expected);
  });

  test('parseEmailDomains reads a messy CSV and treats unset/blank as "all domains"', () => {
    expect([...parseEmailDomains(' @Kantor.ID , mitra.co.id,, ')]).toEqual([
      'kantor.id',
      'mitra.co.id',
    ]);
    expect(parseEmailDomains(undefined).size).toBe(0);
    expect(parseEmailDomains('').size).toBe(0);
  });

  test.each([
    ['budi@kantor.id', true],
    ['budi.s+tag@mail.kantor.id', true],
    ['büdi@kantor.id', false],
    ['budi@kantör.id', false],
    ['budi@kantor', false],
    ['budi kantor@kantor.id', false],
    ['@kantor.id', false],
    [`${'a'.repeat(250)}@kantor.id`, false],
  ])('isInvitableEmail(%p) = %p', (email, expected) => {
    expect(isInvitableEmail(normalizeEmail(email))).toBe(expected);
  });
});

describe('decideNewUser', () => {
  test('refuses a domain outside the allow-list, even for an invited or super-admin email', async () => {
    const { deps: d, calls } = deps(
      { allowedDomains: new Set(['kantor.id']), superAdminEmails: new Set(['boss@evil.com']) },
      INVITE,
    );
    for (const email of ['x@evil.com', 'boss@evil.com']) {
      expect(await decideNewUser(googleSignUp(email), d)).toEqual({
        allow: false,
        reason: 'DOMAIN_NOT_ALLOWED',
      });
    }
    expect(calls).toEqual([]);
  });

  test('allows any domain when the allow-list is empty', async () => {
    const { deps: d } = deps();
    const r = await decideNewUser(googleSignUp('x@anything.example'), d);
    expect(r).toMatchObject({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
  });

  test('closes email sign-up in production', async () => {
    const { deps: d, calls } = deps({ isProd: true }, INVITE);
    const r = await decideNewUser(
      { email: 'x@kantor.id', emailVerified: true, viaEmailSignUp: true },
      d,
    );
    expect(r).toEqual({ allow: false, reason: 'EMAIL_SIGNUP_CLOSED' });
    expect(calls).toEqual([]);
  });

  test('outside production email sign-up is marked verified so a dev super-admin keeps /dev', async () => {
    const { deps: d } = deps({ isProd: false, superAdminEmails: new Set(['dev@kantor.id']) });
    const r = await decideNewUser(
      { email: 'Dev@Kantor.ID', emailVerified: false, viaEmailSignUp: true },
      d,
    );
    expect(r).toMatchObject({
      allow: true,
      data: { approvalStatus: 'approved', role: 'super-admin', emailVerified: true },
    });
  });

  test('verified invitation => approved with the invited role and the inviter as decider', async () => {
    const { deps: d, calls } = deps({}, INVITE);
    const r = await decideNewUser(googleSignUp(' Budi@Kantor.ID '), d);
    expect(calls).toEqual(['budi@kantor.id']);
    expect(r).toMatchObject({
      allow: true,
      invitationId: 'inv-1',
      data: { approvalStatus: 'approved', role: 'project_manager', approvalDecidedBy: 'admin-1' },
    });
    if (r.allow) expect(r.data.approvalDecidedAt).toBeInstanceOf(Date);
  });

  test('an invitation whose inviter was deleted still approves, without a decider', async () => {
    const { deps: d } = deps({}, { ...INVITE, invitedBy: null });
    const r = await decideNewUser(googleSignUp('x@kantor.id'), d);
    expect(r).toMatchObject({ allow: true, data: { approvalStatus: 'approved' } });
    if (r.allow) expect('approvalDecidedBy' in r.data).toBe(false);
  });

  test('unverified email never claims the invitation and stays pending', async () => {
    const { deps: d, calls } = deps({}, INVITE);
    const r = await decideNewUser(googleSignUp('x@kantor.id', false), d);
    expect(r).toEqual({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
    expect(calls).toEqual([]);
  });

  test('no live invitation (expired, revoked or used => claim returns null) => pending', async () => {
    const { deps: d, calls } = deps({}, null);
    const r = await decideNewUser(googleSignUp('x@kantor.id'), d);
    expect(r).toEqual({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
    expect(calls).toEqual(['x@kantor.id']);
  });

  test('verified super-admin email => approved super-admin without touching invitations', async () => {
    const { deps: d, calls } = deps({ superAdminEmails: new Set(['boss@kantor.id']) }, INVITE);
    const r = await decideNewUser(googleSignUp('Boss@kantor.id'), d);
    expect(r).toMatchObject({
      allow: true,
      data: { approvalStatus: 'approved', role: 'super-admin' },
    });
    if (r.allow) expect(r.invitationId).toBeUndefined();
    expect(calls).toEqual([]);
  });

  test('unverified super-admin email is just pending', async () => {
    const { deps: d } = deps({ superAdminEmails: new Set(['boss@kantor.id']) });
    const r = await decideNewUser(googleSignUp('boss@kantor.id', false), d);
    expect(r).toEqual({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
  });

  test('a database failure while claiming fails closed to pending and logs no email', async () => {
    const logged: unknown[] = [];
    registerProcessLogger({ warn: (obj) => logged.push(obj), error: () => {} });
    const { deps: d } = deps({
      claimInvitation: async () => {
        throw Object.assign(new Error('boom for budi@kantor.id'), { code: '57P01' });
      },
    });
    const r = await decideNewUser(googleSignUp('budi@kantor.id'), d);
    expect(r).toEqual({ allow: true, data: { approvalStatus: 'pending', role: 'member' } });
    expect(logged).toHaveLength(1);
    expect(JSON.stringify(logged)).not.toContain('budi@kantor.id');
  });

  test('a corrupt super-admin role on an invitation row is clamped to member', async () => {
    const { deps: d } = deps({}, { ...INVITE, role: 'super-admin' });
    const r = await decideNewUser(googleSignUp('x@kantor.id'), d);
    expect(r).toMatchObject({ allow: true, data: { approvalStatus: 'approved', role: 'member' } });
  });
});
