/**
 * Text and size limits for project writes (S1-03). Pure: the project form imports it, so the form
 * and the write routes validate against the same numbers.
 */
import type { ProjectStatus } from '../pm/enums';

/** Longest project name and description accepted by the form and the write routes. */
export const PROJECT_NAME_MAX = 120;
export const PROJECT_DESCRIPTION_MAX = 5000;

/** Most members a new project may be created with (the creator is added on top). */
export const PROJECT_CREATE_MEMBERS_MAX = 50;

/** Statuses a project may start in (M24); the other three are reached later through `/status`. */
export const PROJECT_INITIAL_STATUSES = [
  'draft',
  'active',
] as const satisfies readonly ProjectStatus[];
export type ProjectInitialStatus = (typeof PROJECT_INITIAL_STATUSES)[number];
