/**
 * Writes of `leave_period`: an Admin records someone's leave or ends the one under way (P14 D3).
 * There is no application and no approval — a row that exists is a leave that holds — so the only
 * rules left are the range itself (`leave.validate.ts`) and that one person's periods may not
 * overlap (P14 §10 T2). Recording a range that is already past is allowed on purpose (§10 T3).
 *
 * Both writes open one transaction and tell the person inside it, so the card follows the write.
 * Every refusal is a value, never a throw; the route maps its code through the error catalog.
 */
import { and, eq } from 'drizzle-orm';
import { leavePeriod } from '../db/schema';
import type { IsoDate } from '../metrics/types';
import { emitLeaveRecorded } from '../notification/emit.leave.recorded';
import { inTx } from '../pm/tx';
import { type LeaveRefusal, refusal } from './leave.dto';
import { formatLeaveRange } from './leave.format';
import { overlappingPeriod, runningPeriod } from './leave.query';
import {
  cleanLeaveInput,
  isLeaveRefusal,
  LEAVE_MESSAGES,
  type LeaveInput,
  leaveDays,
} from './leave.validate';

/** A period as the admin API answers it; the note comes back because only an Admin reads it (P14 D6). */
export type LeavePeriodDto = {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  note: string | null;
  days: number;
};

export type SetLeaveOk = {
  ok: true;
  period: LeavePeriodDto;
  /** The period that was overwritten, or null when this is the first one; the audit entry names it. */
  replaced: LeavePeriodDto | null;
};

export type ClearLeaveOk = { ok: true; cleared: LeavePeriodDto };

export type SetLeaveArgs = {
  /** Whose leave is being recorded. */
  userId: string;
  /** The Admin acting; they are the card's actor and the audit entry's actor. */
  by: string;
  input: LeaveInput;
  /** Today in the team zone, injected by the route — never read from the clock here. */
  today: IsoDate;
};

/** The columns both writes read back; `dtoOf` turns them into the answer. */
const RETURNING = {
  id: leavePeriod.id,
  startDate: leavePeriod.startDate,
  endDate: leavePeriod.endDate,
  note: leavePeriod.note,
} as const;

const dtoOf = (row: {
  id: string;
  startDate: IsoDate;
  endDate: IsoDate;
  note: string | null;
}): LeavePeriodDto => ({ ...row, days: leaveDays(row.startDate, row.endDate) });

/**
 * Records a leave period, replacing the one under way when there is one: an Admin correcting
 * today's dates is the ordinary case, and two rows for one leave would only be read as two leaves.
 * A range that touches any other period of the same person is refused with `LEAVE_OVERLAP`, and the
 * message names that period (§10 T2) so the Admin can go and fix it.
 */
export async function setLeavePeriod(args: SetLeaveArgs): Promise<SetLeaveOk | LeaveRefusal> {
  const clean = cleanLeaveInput(args.input);
  if (isLeaveRefusal(clean)) return clean;
  return inTx(async (tx) => {
    const running = await runningPeriod(args.userId, args.today, tx);
    const clash = await overlappingPeriod(
      args.userId,
      clean.startDate,
      clean.endDate,
      running?.id ?? null,
      tx,
    );
    if (clash)
      return refusal(
        'LEAVE_OVERLAP',
        LEAVE_MESSAGES.overlap(formatLeaveRange(clash.startDate, clash.endDate)),
      );
    const values = { startDate: clean.startDate, endDate: clean.endDate, note: clean.note };
    const [row] = running
      ? await tx
          .update(leavePeriod)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(leavePeriod.id, running.id))
          .returning(RETURNING)
      : await tx
          .insert(leavePeriod)
          .values({ ...values, userId: args.userId, createdBy: args.by })
          .returning(RETURNING);
    if (!row) throw new Error(`leave period write returned no row for user ${args.userId}`);
    const period = dtoOf(row);
    await emitLeaveRecorded(tx, {
      periodId: period.id,
      userId: args.userId,
      startDate: period.startDate,
      endDate: period.endDate,
      days: period.days,
      by: args.by,
      change: 'set',
    });
    return { ok: true, period, replaced: running ? dtoOf(running) : null };
  });
}

/**
 * Ends the leave under way: the row goes, because a period that was cut short is not a shorter
 * leave — it is a leave that should not have been recorded, and nothing else reads it (P14 §6).
 * Refuses with `NOT_FOUND` when the person is not on leave today; there is nothing to end.
 */
export async function clearLeavePeriod(args: {
  userId: string;
  by: string;
  today: IsoDate;
}): Promise<ClearLeaveOk | LeaveRefusal> {
  return inTx(async (tx) => {
    const running = await runningPeriod(args.userId, args.today, tx);
    if (!running)
      return refusal('NOT_FOUND', 'Orang ini tidak sedang cuti, jadi tidak ada yang diakhiri.');
    await tx
      .delete(leavePeriod)
      .where(and(eq(leavePeriod.id, running.id), eq(leavePeriod.userId, args.userId)));
    const cleared = dtoOf(running);
    await emitLeaveRecorded(tx, {
      periodId: cleared.id,
      userId: args.userId,
      startDate: cleared.startDate,
      endDate: cleared.endDate,
      days: cleared.days,
      by: args.by,
      change: 'cleared',
    });
    return { ok: true, cleared };
  });
}
