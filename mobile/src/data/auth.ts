// Sign-in screens' data (prototype auth.*.jsx): the Google account picker, the rejection reason and the profile form
// while waiting for approval. UI only in Phase 1; Phase 2 signs in with Better Auth here.
export type { AuthAccount } from './sample/auth';

import { AUTH_ACCOUNTS, AUTH_NAME, DENIED_REASON, PENDING_PROFILE } from './sample/auth';

/** What the auth screens show. */
export const getAuth = () => ({
  name: AUTH_NAME,
  accounts: AUTH_ACCOUNTS,
  deniedReason: DENIED_REASON,
  profile: PENDING_PROFILE,
});
