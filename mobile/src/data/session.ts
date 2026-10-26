import type { Role } from './sample';

/**
 * Role of the signed-in person. Fixed to the prototype's default (Project Manager) until Phase 2 signs in for real;
 * screens take it as a prop so tests render every role.
 */
export const SESSION_ROLE: Role = 'pm';
