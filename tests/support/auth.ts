/** Auth spies (S0B-21): drive the session and role the real guards see by spying, never by replacing a module. */
import { afterAll, beforeAll, spyOn } from 'bun:test';
import { auth } from '../../server/auth';
import type { Role } from '../../server/permissions';
import * as rolesMod from '../../server/roles';

const TEST_EMAIL_DOMAIN = 'example.test'; // test-only

/** Minimum a test user needs to sign in; the factory's `TestUser` satisfies it. */
export type AuthActor = {
  id: string;
  role: string;
  email?: string;
  name?: string;
  approvalStatus?: string;
  banned?: boolean;
};

export type AuthSpies = {
  /** Signs the next requests in as `actor`, or out when `null`. Impersonation is opt-in per call. */
  as(actor: AuthActor | null, opts?: { impersonatedBy?: string }): void;
};

/**
 * Spies on `auth.api.getSession` and `resolveUserRole` for the enclosing file or describe.
 * They are installed in `beforeAll` and restored in `afterAll`, so other files see the real functions.
 * Spies, not a module replacement: that leaks into unrelated files of the same run.
 */
export function installAuthSpies(): AuthSpies {
  let current: { actor: AuthActor; impersonatedBy: string | null } | null = null;
  let spies: Array<{ mockRestore(): void }> = [];

  beforeAll(() => {
    spies = [
      spyOn(auth.api, 'getSession').mockImplementation((async () => {
        if (!current) return null;
        const { actor } = current;
        return {
          user: {
            id: actor.id,
            email: actor.email ?? `${actor.id}@${TEST_EMAIL_DOMAIN}`,
            name: actor.name ?? actor.id,
            role: actor.role,
            approvalStatus: actor.approvalStatus ?? 'approved',
            banned: actor.banned ?? false,
          },
          session: { impersonatedBy: current.impersonatedBy },
        };
      }) as unknown as typeof auth.api.getSession),
      // The real resolver downgrades `super-admin` users not listed in SUPER_ADMIN_EMAILS and writes to the DB.
      spyOn(rolesMod, 'resolveUserRole').mockImplementation(
        async () => (current?.actor.role ?? 'member') as Role,
      ),
    ];
  });
  afterAll(() => {
    for (const s of spies) s.mockRestore();
    spies = [];
    current = null;
  });

  return {
    as(actor, opts) {
      current = actor ? { actor, impersonatedBy: opts?.impersonatedBy ?? null } : null;
    },
  };
}
