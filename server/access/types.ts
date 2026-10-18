/**
 * Canonical subject and actor shapes shared by every access policy (S0.b).
 * Type-only: nothing here may import env/db/Bun, the browser bundle reads it.
 * Deliberately not named `Actor`: that name belongs to `server/guard.ts` (R03 F2).
 */
import type { Role } from '../permissions';
import type { ProjectMemberRole, ProjectStatus, TaskStatus } from '../pm/enums';

/** Role of a user inside one project; same tuple as the DB CHECK in `pm/enums`. */
export type ProjectRole = ProjectMemberRole;

/** The acting user as the policy sees them; `impersonating` is true while a super-admin is acting as someone else (Q9). */
export type Principal = { id: string; appRole: Role; impersonating: boolean };

/** The principal's `project_members` row for the subject's project, or null when they are not a member. */
export type Membership = { role: ProjectRole; joinedAt: Date } | null;

// `leadId`/`createdBy` are nullable because the FK is ON DELETE SET NULL (X3 M3):
// a deleted user leaves the row behind, so policies must not assume an owner exists.
/** The slice of a project row the policies read. */
export type ProjectSubject = {
  id: string;
  status: ProjectStatus;
  leadId: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

/** The slice of a task row the policies read; `projectDeletedAt` lets a task inherit its project's trash state. */
export type TaskSubject = {
  id: string;
  projectId: string;
  status: TaskStatus;
  createdBy: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
  needsReview: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  projectDeletedAt: Date | null;
};

/**
 * The slice of an event row the policies read. `projectId` is null for a personal event, which
 * has no project to derive a level from, so only its creator and guests may see it.
 * `projectDeletedAt` lets an event inherit its project's trash state, as `TaskSubject` does.
 */
export type EventSubject = {
  id: string;
  projectId: string | null;
  createdBy: string | null;
  canceledAt: Date | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  projectDeletedAt: Date | null;
  /**
   * Whether the principal being checked is on the guest list. The only participant fact the
   * policies need, so a list row costs one boolean instead of the whole roster; the service
   * loads it (`server/event/events.access.ts`) and the policy stays pure.
   */
  isParticipant: boolean;
};
