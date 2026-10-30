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

// Stored in project_phase.status; `in_progress` (not `active`) follows R02 so the DB and the DTO share one word.
export const PHASE_STATUSES = ['not_started', 'in_progress', 'done'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

// Why a deadline was moved (S5). Four buckets keep the select short for non-technical users;
// the free-text `reason` carries the detail. Replaces the five-value draft in R02 (see the S5a-01 report).
export const EXTENSION_REASON_CATEGORIES = [
  'scope_change',
  'dependency',
  'resource',
  'other',
] as const;
export type ExtensionReasonCategory = (typeof EXTENSION_REASON_CATEGORIES)[number];

export const TASK_BASE_KINDS = ['task', 'issue', 'idea'] as const;
export type TaskBaseKind = (typeof TASK_BASE_KINDS)[number];

// What a saved project_template was built from: a story-mode draft, or typed in by hand (S0-S2 extension).
export const PROJECT_TEMPLATE_SOURCES = ['story', 'manual'] as const;
export type ProjectTemplateSource = (typeof PROJECT_TEMPLATE_SOURCES)[number];

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

// --- Event (S7) ---

// `meeting` is the default: almost every event created from the two-stage form is a meeting.
export const EVENT_KINDS = ['meeting', 'review', 'important', 'team', 'other'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

// Where it happens decides which field the form asks for next: a room (`location_text`) or a link (`meeting_url`).
export const EVENT_LOCATION_TYPES = ['offline', 'online'] as const;
export type EventLocationType = (typeof EVENT_LOCATION_TYPES)[number];

// Notes stay editable while `draft`; `confirmed` is what participants are told to read.
export const EVENT_NOTE_STATUSES = ['draft', 'confirmed'] as const;
export type EventNoteStatus = (typeof EVENT_NOTE_STATUSES)[number];

// Default reminder offsets in minutes before `starts_at`: one day ahead to plan, 30 minutes ahead to join.
// Not an enum: this is the DEFAULT of `event.reminders_minutes`, and the per-event list may differ.
export const EVENT_REMINDER_OFFSETS_MIN = [1440, 30] as const;
export type EventReminderOffset = (typeof EVENT_REMINDER_OFFSETS_MIN)[number];
