import type { auth } from '@server/auth';
import { ac, roles } from '@server/permissions';
import { adminClient, inferAdditionalFields, multiSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth browser client. Same-origin, so no baseURL needed; it defaults
 * to the current origin and talks to /api/auth/*.
 */
export const authClient = createAuthClient({
  // inferAdditionalFields: types `session.user.approvalStatus` etc. (type-only, no server code shipped).
  plugins: [adminClient({ ac, roles }), multiSessionClient(), inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
