/**
 * Why a control is greyed out, in English (decision E-6, `reacttransition.md` §1, 28 Oct 2026).
 *
 * A record's `can{}` holds `true` (enabled), a deny code (shown disabled) or nothing (hidden). Only
 * the codes the server marks `ui: 'disable'` in `server/access/decision.ts` (plus the reviewer-pick
 * one from `server/pm/errors.ts`) ever reach the app as a value; the hidden ones arrive as a missing
 * key. Their server sentences are Indonesian, so the app keeps its own English for each, with the
 * same advice. Shared by Tasks, Projects and Events.
 */
import type { CapValueWire } from './tasks.wire';

const DISABLED: Readonly<Record<string, string>> = {
  SELF_REVIEW: "You can't review your own work. Ask another manager to review it.",
  SELF_TARGET: "You can't change your own account. Ask another Admin to do it.",
  TARGET_PROTECTED: "This account or role is protected and can't be changed with your access.",
  IMPERSONATING: 'This is turned off while you act as another user. Stop acting as them first.',
  LOCKED_BY_STATUS: 'This is locked while the task is in review, done, or canceled.',
  REVIEW_REQUIRED: 'This task needs a review first. Ask for a review before finishing it.',
  LAST_MANAGER: 'A project needs at least one manager. Make someone else a manager first.',
  IS_LEAD: 'They still lead this project. Choose another lead first.',
  PROJECT_IN_TRASH: 'Its project is in the Trash. Restore the project first.',
  REASON_REQUIRED: 'Write a reason so the team understands.',
  CANCEL_NOTE_REQUIRED: "Choosing 'Other' needs a short note. Write the reason first.",
  ROLE_CANNOT_TRASH: 'Only an Admin or a Project Manager can delete a project. Ask them to do it.',
  EXPIRED: 'Its time in the Trash is over, so it can no longer be restored.',
  NO_ELIGIBLE_REVIEWER: 'There is no reviewer to choose yet. Contact the project manager.',
};

/** For a code a newer server adds: still says why, without guessing the reason. */
export const CAP_UNKNOWN = "You can't do this right now.";

/** The sentence for a deny code; a code this app does not know gets CAP_UNKNOWN. */
export const capMessage = (code: string): string => DISABLED[code] ?? CAP_UNKNOWN;

/** The reason a capability is off, or null when it is enabled or hidden (absent). */
export const capReason = (value: CapValueWire | undefined): string | null =>
  typeof value === 'string' ? capMessage(value) : null;
