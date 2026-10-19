/**
 * Who may send a task to the Trash. Kept apart from `trash.policy` so `capabilities` (which that file
 * imports) can build the `trash` capability without an import cycle; `trash.policy` re-exports it.
 */
import { deny } from './decision';
import { ACCESS_RULES, type AccessRules } from './rules';
import { guardTask, type TaskDecision } from './task.policy';
import type { Membership, Principal, TaskSubject } from './types';

/**
 * Whether `p` may move the task to the Trash: its creator, any manager of the project (a
 * Member-manager included) and Admin/Super-admin; a Member who is only the assignee may not, and
 * an Observer may not either (user decision in `JADWAL-S3-S8.md` §5 no. 4, answering P8 Q1; the
 * "Member-manager may not" rule is about trashing a *project*, CLAUDE.md T2, not a task).
 * Impersonation is refused first because the delete is destructive (Q9); the task's own trash state
 * is checked last, so deleting twice reads as `WRONG_STATE` and a task inside a trashed project as
 * `PROJECT_IN_TRASH`.
 */
export function canTrashTask(
  p: Principal,
  task: TaskSubject,
  m: Membership,
  rules: AccessRules = ACCESS_RULES,
): TaskDecision {
  if (p.impersonating) return deny('IMPERSONATING');
  return guardTask(p, task, m, 'creator', rules);
}
