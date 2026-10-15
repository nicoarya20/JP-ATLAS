/**
 * Shared enum tuples for the PM modules (S0-S2). Single source for DB CHECK
 * constraints, API validation and UI selects; keep this file dependency-free
 * so the browser bundle can import it.
 */

export const PROJECT_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'canceled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_MEMBER_ROLES = ['manager', 'member', 'viewer'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const PROJECT_CONDITIONS = ['on_track', 'at_risk', 'off_track'] as const;
export type ProjectCondition = (typeof PROJECT_CONDITIONS)[number];

export const TASK_BASE_KINDS = ['task', 'issue', 'idea'] as const;
export type TaskBaseKind = (typeof TASK_BASE_KINDS)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_CANCEL_CATEGORIES = [
  'duplicate',
  'not_needed',
  'out_of_scope',
  'created_by_mistake',
  'other',
] as const;
export type TaskCancelCategory = (typeof TASK_CANCEL_CATEGORIES)[number];

// Values are stored verbatim in profile.text_size and mirror the three UI scales (1 / 1.25 / 1.5).
export const TEXT_SIZES = ['normal', 'besar', 'sangat_besar'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
