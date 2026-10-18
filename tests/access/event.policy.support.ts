// Shared fixtures for the event policy tests (split so each test file stays under the 400-line cap).
import type {
  EventSubject,
  Membership,
  Principal,
  ProjectRole,
  ProjectSubject,
} from '../../server/access/types';
import { ROLES } from '../../server/permissions';

// Matrix of P6 §6 E-02: four account roles x four membership states x every event action, read off
// the pure policy (no DB). The key case the plan names explicitly is "Pemantau tidak bisa membuat
// acara di proyeknya" and it gets its own test below. All ids and dates here are test-only.
export const PROJECT_ID = 'P-atlas';
export const OTHER_ID = 'U-someone-else';
export const NOW = new Date('2026-11-02T02:00:00.000Z');

export type MembershipState = 'manager' | 'member' | 'viewer' | 'none';
export const MEMBERSHIP_STATES: readonly MembershipState[] = [
  'manager',
  'member',
  'viewer',
  'none',
];
export const APP_ROLES = [
  ROLES.MEMBER,
  ROLES.PROJECT_MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
] as const;

export const principal = (
  appRole: (typeof APP_ROLES)[number],
  overrides: Partial<Principal> = {},
) => ({
  id: 'U-actor',
  appRole,
  impersonating: false,
  ...overrides,
});

export function membership(state: MembershipState): Membership {
  if (state === 'none') return null;
  return { role: state as ProjectRole, joinedAt: new Date('2026-09-01T00:00:00Z') };
}

export function eventRow(overrides: Partial<EventSubject> = {}): EventSubject {
  return {
    id: 'E-rapat',
    projectId: PROJECT_ID,
    createdBy: OTHER_ID,
    canceledAt: null,
    deletedAt: null,
    deletedBy: null,
    projectDeletedAt: null,
    isParticipant: false,
    ...overrides,
  };
}

export function projectRow(overrides: Partial<ProjectSubject> = {}): ProjectSubject {
  return {
    id: PROJECT_ID,
    status: 'active',
    leadId: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

/** `ok` or the deny code, so a matrix row reads as one short string. */
export const verdict = (d: { ok: boolean; code?: string }) => (d.ok ? 'ok' : (d.code as string));
