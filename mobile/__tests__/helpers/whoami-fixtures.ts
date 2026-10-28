// `GET /api/app/whoami` answers per role, the app-wide caps the server's `appCaps()` gives each
// (`server/access/capabilities.ts`): a Member may not start a project; everyone may make a personal event. test-only
import type { AppCapsWire, WhoamiWire } from '@/data/whoami.api';

import type { Role } from '../../src/data/sample/people';
import type { AuthRoutes } from './auth-server';

export const CAPS: Record<Role, AppCapsWire> = {
  member: { createProject: false, createEvent: true, dashboard: false, dev: false },
  pm: { createProject: true, createEvent: true, dashboard: false, dev: false },
  admin: { createProject: true, createEvent: true, dashboard: true, dev: false },
};

const APP_ROLE: Record<Role, string> = { member: 'member', pm: 'project_manager', admin: 'admin' };

/** The whoami body of the seeded session user as `role`. */
export const whoamiAs = (role: Role): WhoamiWire => ({
  userId: 'u-nico',
  name: 'Nico Arya',
  role: APP_ROLE[role],
  caps: CAPS[role],
});

/** A serveAuth route answering whoami as `role`, to spread into a test's routes. */
export const whoamiRoute = (role: Role = 'pm'): AuthRoutes => ({
  '/api/app/whoami': { body: whoamiAs(role) },
});
