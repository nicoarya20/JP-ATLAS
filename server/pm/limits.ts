/**
 * Fixed limits and feature flags for the PM modules (S0-S2). Pure: imported by
 * the browser bundle, so env-driven overrides live in the server consumers.
 */
import type { TaskBaseKind } from './enums';

/** Task kinds seeded for every new project; array order is the `position` order. */
export const DEFAULT_TASK_KINDS: ReadonlyArray<{ name: string; baseKind: TaskBaseKind }> = [
  { name: 'Tugas', baseKind: 'task' },
  { name: 'Bug', baseKind: 'issue' },
  { name: 'Ide', baseKind: 'idea' },
];

/** Keyset list pages: default and hard maximum rows per request. */
export const PAGE_LIMIT_DEFAULT = 25;
export const PAGE_LIMIT_MAX = 100;

/** Per-user write limiter (R04 §3.10): `WRITE_RATE_MAX` writes per window. */
export const WRITE_RATE_MAX = 60;
export const WRITE_RATE_WINDOW_SECONDS = 60;

/**
 * Task review (T7) stays hidden until S4 ships (X3 M25); flipping it early would
 * let `needs_review` lock tasks that nobody can approve.
 */
export const TASK_REVIEW_UI_ENABLED = false;

/**
 * Project deletion is visible because the minimal project Trash page ships in S1
 * (KEPUTUSAN-MVP-INTI, 15 Oct 2026, option B; supersedes the P2 K3 default of false).
 */
export const PROJECT_DELETE_UI_ENABLED = true;
