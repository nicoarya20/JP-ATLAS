// Session states a test can start from. Imported from src/session/session.state only, never the
// barrel: the state module pulls in nothing but the store, while the barrel would drag Better Auth
// into every suite jest.setup-after-env.js touches.
import { person } from '@/data/people';
import { forgetAllResources } from '@/data/resource';
import { TODAY } from '@/data/sample/today';
import { type Viewer, viewerOf } from '@/data/viewer';
import {
  INITIAL_SESSION,
  type SessionClock,
  type SessionUser,
  sessionStore,
  setSessionClock,
  setSessionUser,
} from '@/session/session.state';

/** An approved account: the gate lets this one into the app's own screens. */
export const APPROVED_USER: SessionUser = {
  id: 'u-nico',
  email: 'nico@kantor.id',
  name: 'Nico Arya',
  image: null,
  approvalStatus: 'approved',
  approvalReason: null,
  banned: false,
  banReason: null,
  banExpires: null,
};

/** Signed in, still waiting for an Admin: the waiting screen, nothing else. */
export const PENDING_USER: SessionUser = {
  ...APPROVED_USER,
  id: 'u-budi',
  email: 'budi@kantor.id',
  name: 'Budi Santoso',
  approvalStatus: 'pending',
};

/** Turned down, with the Admin's own reason — which arrives in Indonesian and is shown as it came. */
export const REJECTED_USER: SessionUser = {
  ...PENDING_USER,
  approvalStatus: 'rejected',
  approvalReason: 'Bukan akun kantor.',
};

/**
 * The clock the sample rows were written against: the prototype's Wednesday, in the team's zone
 * (`server/metrics/config.ts`). Seeded instead of left to the device, exactly as in the app — the
 * difference is only that here the day is known rather than fetched.
 */
export const TEST_CLOCK: SessionClock = { today: TODAY, timeZone: 'Asia/Jakarta' };

/** Back to the state the app starts in, before anything has been read. */
export function resetSessionForTest(): void {
  sessionStore.set(INITIAL_SESSION);
  // Nothing unmounts in this router, so a resource left loaded would leak into the next test the
  // same way it would leak into the next account (src/data/resource.ts).
  forgetAllResources();
}

/**
 * Starts the test from a session already read, so the gate renders its half of the app on the first
 * frame and nothing is fetched. jest.setup-after-env.js does this for every test; a test about the
 * gate itself calls `resetSessionForTest()` and lets the real read run against a stubbed fetch.
 */
export function seedSession(user: SessionUser = APPROVED_USER): void {
  setSessionUser(user);
  setSessionClock(TEST_CLOCK);
}

/** A signed-in account with no clock yet: what the app looks like between the gate and home. */
export function seedSessionWithoutClock(user: SessionUser = APPROVED_USER): void {
  setSessionUser(user);
}

/**
 * The signed-in person a data module expects, from a sample first name or key ("Nico", "dodi").
 * The tests used to pass the bare name, which is exactly the matching K4 replaced.
 */
export function viewerNamed(nameOrKey: string): Viewer {
  const who = person(nameOrKey);
  if (!who) throw new Error(`No sample person named ${nameOrKey}`);
  return viewerOf(who);
}
