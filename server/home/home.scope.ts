/** "My" projects of the Beranda: the ones the viewer is a member of, whatever their account role. */
import type { ProjectListScope } from '../access/project.policy';
import type { Principal } from '../access/types';

/**
 * Narrower than the Tugas menu on purpose: a Project Manager or Admin may read every project, but a
 * home page about "my" work, "my" projects and what happened around me must not turn into a feed of
 * the whole workspace.
 */
export const mineScope = (p: Principal): ProjectListScope => ({ kind: 'memberOf', userId: p.id });
