/**
 * Shared persona fixtures for the access tests (R03 §3.8). Not a `*.test.ts` file,
 * so `bun test` does not run it. All ids and dates here are test-only.
 */

import type { Membership, Principal, ProjectRole } from '../../server/access/types';
import type { Role } from '../../server/permissions';
import { ROLES } from '../../server/permissions';

/** The eight columns of the permission matrix (R03 §2.2). */
export const PERSONA_CODES = ['SA', 'AD', 'PM-K', 'PM-X', 'M-K', 'AG', 'PT', 'BA'] as const;
export type PersonaCode = (typeof PERSONA_CODES)[number];

export type Persona = {
  code: PersonaCode;
  name: string;
  principal: Principal;
  membership: Membership;
};

type Def = {
  code: PersonaCode;
  name: string;
  appRole: Role;
  project: ProjectRole | null;
  joined?: string;
};

// Names come from the wireframes; Mira and Bella are new examples. Atlas is the fixture project.
const DEFS: readonly Def[] = [
  { code: 'SA', name: 'Boss', appRole: ROLES.SUPER_ADMIN, project: null },
  { code: 'AD', name: 'Ayu', appRole: ROLES.ADMIN, project: 'viewer', joined: '2026-09-02' }, // Observer on Portal Klien
  {
    code: 'PM-K',
    name: 'Nico',
    appRole: ROLES.PROJECT_MANAGER,
    project: 'manager',
    joined: '2026-09-01',
  },
  { code: 'PM-X', name: 'Lea', appRole: ROLES.PROJECT_MANAGER, project: null },
  { code: 'M-K', name: 'Mira', appRole: ROLES.MEMBER, project: 'manager', joined: '2026-09-05' },
  { code: 'AG', name: 'Dodi', appRole: ROLES.MEMBER, project: 'member', joined: '2026-09-10' },
  { code: 'AG', name: 'Rina', appRole: ROLES.MEMBER, project: 'member', joined: '2026-09-10' },
  { code: 'PT', name: 'Sri', appRole: ROLES.MEMBER, project: 'viewer', joined: '2026-09-12' },
  { code: 'BA', name: 'Bella', appRole: ROLES.MEMBER, project: null },
];

function build(d: Def): Persona {
  const id = `U-${d.name.toLowerCase()}`;
  const membership = d.project
    ? { role: d.project, joinedAt: new Date(`${d.joined}T00:00:00Z`) }
    : null;
  return {
    code: d.code,
    name: d.name,
    principal: { id, appRole: d.appRole, impersonating: false },
    membership,
  };
}

/** The first persona for a matrix column, e.g. `persona('PM-K')` is Nico. */
export function persona(code: PersonaCode): Persona {
  const def = DEFS.find((d) => d.code === code);
  if (!def) throw new Error(`Unknown persona code: ${code}`);
  return build(def);
}

/** A persona by wireframe name, for columns with two people (AG: Dodi and Rina). */
export function personaNamed(name: string): Persona {
  const def = DEFS.find((d) => d.name === name);
  if (!def) throw new Error(`Unknown persona name: ${name}`);
  return build(def);
}
