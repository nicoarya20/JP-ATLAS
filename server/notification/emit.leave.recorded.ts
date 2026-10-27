/**
 * The one Inbox card the recorded-leave flow sends (P14 D5): the person whose availability an Admin
 * just wrote down or ended is told about it. Without it somebody's status changes silently and
 * their colleagues see "Cuti" before they know themselves.
 *
 * It lives in its own file rather than in `emit.leave.ts`, because that one belongs to the approval
 * flow and leaves whole in CU-06. Like every emit helper it is called by the service that made the
 * change, inside its transaction, and never throws: `notify()` swallows its own failures.
 */
import type { Executor } from '../pm/tx';
import { notify } from './notification.notify';

export type LeaveRecordedEmit = {
  /** The period the card points at; the button leads to Pengaturan > Ketersediaan either way. */
  periodId: string;
  /** Whose leave it is — the only recipient. */
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  /** The Admin who acted; `notify()` drops them from the recipients, so recording your own sends nothing. */
  by: string;
  change: 'set' | 'cleared';
  at?: Date;
};

/** Tells one person what an Admin recorded about their leave. */
export async function emitLeaveRecorded(exec: Executor, i: LeaveRecordedEmit): Promise<void> {
  await notify(exec, {
    kind: 'leave_recorded',
    recipients: [i.userId],
    actorId: i.by,
    projectId: null,
    ref: { type: 'leave', id: i.periodId },
    // A fixed `sub` per change: "dicatat" and "diakhiri" are two different pieces of news about the
    // same period, so they must not bundle into one line the way two edits within an hour may.
    sub: i.change,
    payload: {
      startDate: i.startDate,
      endDate: i.endDate,
      days: i.days,
      change: i.change,
    },
    at: i.at,
  });
}
