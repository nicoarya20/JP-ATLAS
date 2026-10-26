// Session states a test can start from. Imported from src/session/session.state only, never the
// barrel: the state module pulls in nothing but the store, while the barrel would drag Better Auth
// into every suite jest.setup-after-env.js touches.
import {
  INITIAL_SESSION,
  type SessionUser,
  sessionStore,
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

/** Back to the state the app starts in, before anything has been read. */
export function resetSessionForTest(): void {
  sessionStore.set(INITIAL_SESSION);
}

/**
 * Starts the test from a session already read, so the gate renders its half of the app on the first
 * frame and nothing is fetched. jest.setup-after-env.js does this for every test; a test about the
 * gate itself calls `resetSessionForTest()` and lets the real read run against a stubbed fetch.
 */
export function seedSession(user: SessionUser = APPROVED_USER): void {
  setSessionUser(user);
}
