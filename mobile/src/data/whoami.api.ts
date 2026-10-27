/**
 * `GET /api/app/whoami`: who the server thinks is calling, and what the app as a whole lets them
 * do. Two things this app had no source for before.
 *
 * - **The account role.** The session payload from `/api/auth/get-session` carries no role, so the
 *   screens have been rendered as `SESSION_ROLE` (a fixed `pm`) since Phase 1. The role here is
 *   the stored one, and it is used for **copy only** — the label under a name, which heading the
 *   Team list puts over its projects. Never for permission: what a caller may do arrives as
 *   `can{}` on the record itself, or as `caps` below.
 * - **`caps`** (`AppCaps`), the same map the web layout loader reads (`server/api/app-whoami.ts`),
 *   so the two clients cannot drift on who may start a project.
 *
 * The mobile `Role` has three values and the server's has four; `super-admin` folds into `admin`
 * for the three-way branch (GAP A-1) while `roleLabel()` keeps the four apart for display, because
 * telling a super-admin they are an Admin would be a lie this app made up.
 */
import { apiGet } from '@/api';

import { resource } from './resource';
import type { Role } from './sample';

/** The four roles `server/permissions.ts` stores. */
export type WireRole = 'member' | 'project_manager' | 'admin' | 'super-admin';

/** App-wide capabilities, mirroring `AppCaps` in `server/access/capabilities.ts`. */
export type WireAppCaps = {
  createProject: boolean;
  createEvent: boolean;
  dashboard: boolean;
  dev: boolean;
};

export type WhoamiWire = {
  userId: string;
  name: string;
  role: WireRole;
  caps: WireAppCaps;
};

/** Who is calling. One request per app start; nothing invalidates it but a sign out. */
export const whoamiResource = resource<WhoamiWire>('whoami', () =>
  apiGet<WhoamiWire>('/api/app/whoami'),
);

/** Ask for the caller once; safe from every screen, every mount. */
export const ensureWhoami = (): Promise<unknown> => whoamiResource.ensure();

const ROLE_OF: Record<WireRole, Role> = {
  member: 'member',
  project_manager: 'pm',
  admin: 'admin',
  // A super-admin may do everything an Admin may; the three-way branch has no fourth arm (A-1).
  'super-admin': 'admin',
};

const ROLE_LABEL: Record<WireRole, string> = {
  member: 'Member',
  project_manager: 'Project Manager',
  admin: 'Admin',
  'super-admin': 'Super-admin',
};

/** The caller's role as the screens branch on it, or null before whoami has answered. */
export const whoamiRole = (): Role | null => {
  const wire = whoamiResource.current()?.role;
  return wire ? (ROLE_OF[wire] ?? null) : null;
};

/** The caller's account role as it is shown to them ("Project Manager"), or null before it loads. */
export const whoamiRoleLabel = (): string | null => {
  const wire = whoamiResource.current()?.role;
  return wire ? (ROLE_LABEL[wire] ?? null) : null;
};

/** What the app as a whole allows, or null before whoami has answered. */
export const whoamiCaps = (): WireAppCaps | null => whoamiResource.current()?.caps ?? null;
