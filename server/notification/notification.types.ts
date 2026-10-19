/**
 * Payload shapes of the Inbox cards (S3 I02, P5 §5.2). Type-only, so the emit helpers, the catalog
 * and the read API share one definition. The payload is a snapshot the card renders: a title, a
 * number, a project name and at most a short excerpt — never an email address or a phone number (R12).
 */
import type {
  NotificationLane,
  NotificationRefType,
  ResolveReason,
} from '../db/schema.notification';
import type { ProjectMemberRole } from '../pm/enums';

export type { NotificationLane, NotificationRefType, ResolveReason };

/** Longest excerpt a card may carry; the composer truncates, it never rejects (P5 §5.3 butir 5). */
export const PAYLOAD_EXCERPT_MAX = 140;

/** What the card points at; `type` picks the href and `ref_type`/`ref_id` are stored as given. */
export type NotificationRef = { type: NotificationRefType; id: string };

/** A task card: `number` is what the user sees ("#14"), `projectName` the line under the sentence. */
export type TaskCardPayload = {
  title: string;
  number: number;
  projectName?: string;
  /** Comment or reason extract, already cut to `PAYLOAD_EXCERPT_MAX`. */
  excerpt?: string;
};

/** A project card: membership and role changes name the project, not the task. */
export type ProjectCardPayload = { projectName: string; role?: ProjectMemberRole };

/** An account card (Admin queue): the display name only, so no contact detail reaches the Inbox. */
export type AccountCardPayload = { name: string };

/** An event card (S7): `startsAt` is an ISO string so the payload stays JSON. */
export type EventCardPayload = { title: string; startsAt?: string; projectName?: string };

/**
 * Every kind the Inbox knows, with the payload it carries. This map is the list of kinds:
 * `NOTIFICATION_KINDS` in the catalog is typed against it, so a new kind cannot be added
 * without giving it a lane, a category and its Indonesian copy.
 */
export type NotificationPayloadByKind = {
  // Shipped in S3.
  task_assigned: TaskCardPayload;
  task_unassigned: TaskCardPayload;
  task_done: TaskCardPayload;
  task_commented: TaskCardPayload;
  task_changed: TaskCardPayload;
  project_member_added: ProjectCardPayload;
  project_role_changed: ProjectCardPayload;
  // Shipped only when I14 is taken (Should): the Admin queue card.
  user_pending: AccountCardPayload;
  // Reserved for S4 (Periksa + mention): the schema and the API must not change when they ship.
  task_review_requested: TaskCardPayload;
  task_review_fallback: TaskCardPayload;
  task_returned: TaskCardPayload;
  mention: TaskCardPayload;
  // Shipped in S7 (Events).
  event_reminder: EventCardPayload;
  event_invited: EventCardPayload;
  event_changed: EventCardPayload;
  event_canceled: EventCardPayload;
};

export type NotificationKind = keyof NotificationPayloadByKind;

/** The payload of one kind, e.g. `NotificationPayload<'task_assigned'>`. */
export type NotificationPayload<K extends NotificationKind = NotificationKind> =
  NotificationPayloadByKind[K];

/** Any payload a card may hold; use it where the kind is only known at runtime. */
export type AnyNotificationPayload = NotificationPayloadByKind[NotificationKind];

/** Variables the copy templates interpolate; all optional, the formatter drops what it is not given. */
export type CopyVars = {
  /** Display name of the actor, or absent when the system acted. */
  actor?: string | null;
  /** How many events the card stands for (`bundle_count`). */
  count?: number;
} & Partial<Record<'title' | 'project' | 'role' | 'name', string>> & { number?: number };
