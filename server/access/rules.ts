/**
 * Permission assumption flags (X2 §2D) for slices S0-S2. These are code, not env:
 * changing one is a release, so permission behaviour never shifts silently between
 * deploys. Numeric thresholds live in `server/metrics` instead. Flags only used by
 * S3+ are added together with the slice that reads them.
 */

export type AccessRules = {
  /** P-A1: a Project Manager who is not a member may open the project read-only; false hides it entirely (404). */
  P_A1_PM_NON_MEMBER_READS: boolean;
  /** P-A1b (Q7): that non-member PM may also comment; default read-only. */
  P_A1B_PM_NON_MEMBER_COMMENTS: boolean;
  /** T-A2: a Member edits only tasks they created or work on (`own`), or every task in the project (`all`). */
  T_A2_MEMBER_EDIT_SCOPE: 'own' | 'all';
  /** T-A4: a task without review may jump from "todo" straight to "done". */
  T_A4_COMPLETE_FROM_TODO: boolean;
  /** T-A5: a Member may switch "needs review" on (never off). */
  T_A5_MEMBER_ENABLES_REVIEW: boolean;
  /** Q12: tasks stay writable in Completed/Canceled/On-hold projects; only the Trash locks them. */
  PROJECT_CLOSED_ALLOWS_TASK_WRITES: boolean;
  /** Default D: a member may remove themselves from a project. */
  MEMBER_CAN_LEAVE_PROJECT: boolean;
  /** 15 Oct 2026 decision: a Member who manages a project may also move it to the Trash; false = only Admin/PM can. */
  MEMBER_MANAGER_CAN_TRASH_PROJECT: boolean;
};

export const ACCESS_RULES: Readonly<AccessRules> = Object.freeze({
  P_A1_PM_NON_MEMBER_READS: true,
  P_A1B_PM_NON_MEMBER_COMMENTS: false,
  T_A2_MEMBER_EDIT_SCOPE: 'own',
  T_A4_COMPLETE_FROM_TODO: true,
  T_A5_MEMBER_ENABLES_REVIEW: true,
  PROJECT_CLOSED_ALLOWS_TASK_WRITES: true,
  MEMBER_CAN_LEAVE_PROJECT: false,
  MEMBER_MANAGER_CAN_TRASH_PROJECT: false,
});
