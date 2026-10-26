import { today } from './clock';
import { me } from './people';
import type { Role, TaskStatus } from './sample';
import { buildTaskDetail, type TaskActionKey, type TaskMenuKey } from './tasks.detail';
import { getTasksState, taskInfo } from './tasks.state';
import { archiveTask, moveTask, unarchiveTask } from './tasks.store';

/*
 * Detail actions and the Return / Cancel sheets (prototype useStatusAction, tasks.sheets.jsx): each writes the new
 * status through tasks.store, logs it as the signed-in person ("Nico started working") and returns the notice to show.
 * An action the detail does not offer to that role throws, so screens never bypass the rules.
 */

const STATUS_ACTION: Record<TaskActionKey, { to: TaskStatus; notice: string; log: string }> = {
  start: { to: 'In progress', notice: 'Task started', log: 'started working' },
  markDone: { to: 'Done', notice: 'Marked as done', log: 'marked this task done' },
  requestReview: { to: 'In review', notice: 'Review requested', log: 'requested review' },
  reopen: { to: 'In progress', notice: 'Task reopened', log: 'reopened this task' },
  approve: { to: 'Done', notice: 'Task approved', log: 'approved this task' },
  restore: { to: 'To do', notice: 'Task restored', log: 'restored this task' },
};

/** Return sheet quick picks (fill the reason). */
export const RETURN_QUICK = ['Still has errors', 'Not as requested', 'Evidence unclear'] as const;

/** Cancel sheet reasons; the last one (Other) needs a note. */
export const CANCEL_REASONS = [
  'Duplicate / already exists',
  'No longer needed',
  'Outside the project scope',
  'Created by mistake',
  'Other',
] as const;
export const CANCEL_OTHER = CANCEL_REASONS.length - 1;

function detailOrThrow(role: Role, no: number, what: string) {
  const d = buildTaskDetail(getTasksState(), role, no);
  if (!d) throw new Error(`Cannot ${what} task #${no}: no such task`);
  return d;
}

const refuse = (what: string, no: number, role: Role) =>
  new Error(`Cannot ${what} task #${no}: not offered to ${role}`);

/** Run a detail button (Start working, Mark done, Request review, Reopen, Approve, Restore). Returns the notice. */
export function runTaskAction(role: Role, no: number, key: TaskActionKey): string {
  const d = detailOrThrow(role, no, key);
  const offered =
    key === 'restore'
      ? d.stateNote?.kind === 'canceled' && d.stateNote.restore
      : d.actions.some((a) => a.key === key);
  if (!offered) throw refuse(key, no, role);
  const viewer = me(role);
  const a = STATUS_ACTION[key];
  const by = taskInfo(getTasksState(), no).reviewer?.split(' ')[0] ?? '';
  const log = key === 'requestReview' ? `${a.log} · reviewer: ${by}` : a.log;
  const extras =
    key === 'requestReview'
      ? { asked: { by: viewer.name, on: today() } }
      : key === 'restore'
        ? { canceled: undefined }
        : undefined;
  moveTask(no, a.to, { log: `${viewer.name} ${log}`, extras });
  return a.notice;
}

/** Times task #no will have been returned after one more Return ("Returned ×n" in the sheet). */
export const nextReturnCount = (no: number) => (getTasksState().info[no]?.returned ?? 0) + 1;

/** Return sheet: back to In progress with the reason logged. Returns the notice. */
export function returnTask(role: Role, no: number, reason: string): string {
  const why = reason.trim();
  if (!detailOrThrow(role, no, 'return').canReturn) throw refuse('return', no, role);
  if (!why) throw new Error(`Cannot return task #${no}: a reason is required`);
  const n = nextReturnCount(no);
  moveTask(no, 'In progress', {
    log: `${me(role).name} returned this task ×${n}: ${why}`,
    extras: { returned: n },
  });
  return 'Task returned';
}

/** Cancel reason as logged: the picked reason (+ note in brackets), or the note itself for Other; null = incomplete. */
export function cancelReason(pick: number, note: string): string | null {
  const extra = note.trim();
  if (pick < 0 || pick > CANCEL_OTHER) return null;
  if (pick === CANCEL_OTHER) return extra || null;
  return `${CANCEL_REASONS[pick]}${extra ? ` (${extra})` : ''}`;
}

const offersMenu = (role: Role, no: number, key: TaskMenuKey) =>
  detailOrThrow(role, no, key).menu.includes(key);

/** Cancel sheet: the task stays listed, marked Canceled with who and why. Returns the notice. */
export function cancelTask(role: Role, no: number, pick: number, note: string): string {
  if (!offersMenu(role, no, 'cancel')) throw refuse('cancel', no, role);
  const reason = cancelReason(pick, note);
  if (!reason) throw new Error(`Cannot cancel task #${no}: pick a reason (Other needs a note)`);
  const by = me(role).name;
  moveTask(no, 'Canceled', {
    log: `${by} canceled this task: ${reason}`,
    extras: { canceled: { reason, by } },
  });
  return 'Task canceled';
}

/** ⋯ › Move to Archive (no dialog: the next screen offers Undo). Returns the snack text. */
export function archiveFromDetail(role: Role, no: number): string {
  if (!offersMenu(role, no, 'archive')) throw refuse('archive', no, role);
  archiveTask(no, me(role).name);
  return 'Task moved to Archive';
}

/** Undo on the Archive snack. Returns the notice. */
export function undoArchive(no: number): string {
  unarchiveTask(no);
  return 'Task restored';
}
