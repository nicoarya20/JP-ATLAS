/**
 * Event reminders (P6 §6 E-04): "a day before" and "half an hour before" as in-app Inbox cards.
 *
 * `runReminderTick(now, deps)` is the whole job and takes "now" as an argument, so a test can walk
 * a meeting through T-1440 and T-30 without waiting. A reminder slot is `(event, offset)`; its
 * `event_reminder` row is the claim. The tick inserts the claim with `ON CONFLICT DO NOTHING
 * RETURNING`, and only the winner sends, so a second tick, a second instance or a restart cannot
 * send the same slot twice. Changing `starts_at` deletes the event's claims (`updateEvent`), which
 * re-arms the slots for the new time; the card key carries `startsAt`, so it is a new card too.
 *
 * A slot that fell due longer than `EVENT_REMINDER_GRACE_MS` ago is claimed but not sent: after the
 * server was down, "tomorrow" must not arrive five minutes before the meeting starts.
 *
 * Each event is handled in its own transaction: the claim and the card commit together or not at
 * all, and one broken event cannot hold up the rest. The people are asked of `notify()`, which
 * drops accounts that cannot sign in, people without project access and anyone who switched the
 * event reminders off.
 */
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { event, eventParticipant, eventReminder, project } from '../db/schema';
import { logger } from '../logger';
import { notify } from '../notification/notification.notify';
import type { Executor } from '../pm/tx';
import { EVENT_REMINDER_MINUTES_MAX } from './events.dto';
import { instant, listable, onProject } from './events.sql';

/** How often the scheduler runs the tick; a slot is at most this late, plus the time the tick takes. */
export const EVENT_REMINDER_TICK_MS = 60_000;
/** A slot due longer ago than this is claimed without sending (the server was down or the event is new). */
export const EVENT_REMINDER_GRACE_MS = 900_000;

const MS_PER_MIN = 60_000;

/** What the tick needs from the outside; tests hand in a counting `notify` or a fixed executor. */
export type ReminderDeps = { exec: Executor; notify: typeof notify };

/** One event with at least one slot due and unclaimed. */
export type DueEvent = {
  id: string;
  title: string;
  startsAt: Date;
  projectId: string | null;
  projectName: string | null;
  /** Every offset of the event that is due now; some may be claimed already, the claim insert sorts that out. */
  offsets: number[];
};

export type ReminderTickResult = {
  /** Slots this tick won. */
  claimed: number;
  /** Slots whose cards were handed to `notify()`. */
  sent: number;
  /** Slots claimed past the grace window, so nothing was sent. */
  stale: number;
  /** Events whose transaction failed; they are retried on the next tick. */
  failed: number;
};

/** The instant a slot falls due: `offset` minutes before the start. */
const dueAt = (startsAt: Date, offset: number) => startsAt.getTime() - offset * MS_PER_MIN;

/**
 * Events with a slot that is due and unclaimed, in one query. "Due" is decided by Postgres from the
 * event's own offsets, "unclaimed" by the absence of its `event_reminder` row. Cancelled, trashed
 * and project-trashed events are out, and so is an event that already started.
 */
export async function selectDueReminders(now: Date, exec: Executor = db): Promise<DueEvent[]> {
  const rows = await exec
    .select({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      projectId: event.projectId,
      projectName: project.name,
      offsets: event.remindersMinutes,
    })
    .from(event)
    .leftJoin(project, onProject)
    .where(
      and(
        listable,
        isNull(event.canceledAt),
        gte(event.startsAt, now),
        // Bounds the range scan on `event_starts_at_idx`; no offset can reach further ahead than this.
        lte(event.startsAt, new Date(now.getTime() + EVENT_REMINDER_MINUTES_MAX * MS_PER_MIN)),
        sql`EXISTS (
          SELECT 1 FROM unnest(${event.remindersMinutes}) AS o(m)
          WHERE ${event.startsAt} - o.m * interval '1 minute' <= ${instant(now)}
            AND NOT EXISTS (
              SELECT 1 FROM ${eventReminder} r WHERE r.event_id = ${event.id} AND r.offset_minutes = o.m
            )
        )`,
      ),
    )
    .orderBy(event.startsAt, event.id);
  return rows.map(({ offsets, ...rest }) => ({
    ...rest,
    offsets: [...new Set(offsets)].filter((o) => dueAt(rest.startsAt, o) <= now.getTime()),
  }));
}

/**
 * Locks the event and confirms it is still the one `selectDueReminders` saw: not cancelled, not
 * trashed, and not moved. An update that moved `starts_at` has deleted the claims in its own
 * transaction; without this check a tick that read the old time could claim them again.
 */
async function stillDue(tx: Executor, ev: DueEvent): Promise<boolean> {
  const rows = await tx
    .select({ id: event.id })
    .from(event)
    .where(
      and(
        eq(event.id, ev.id),
        isNull(event.deletedAt),
        isNull(event.canceledAt),
        eq(event.startsAt, ev.startsAt),
      ),
    )
    .for('update');
  return rows.length > 0;
}

/** Inserts the claims and returns the offsets this call won; an existing claim yields no row. */
async function claim(tx: Executor, eventId: string, offsets: readonly number[]): Promise<number[]> {
  if (offsets.length === 0) return [];
  const won = await tx
    .insert(eventReminder)
    .values(offsets.map((offsetMinutes) => ({ eventId, offsetMinutes })))
    .onConflictDoNothing()
    .returning({ offsetMinutes: eventReminder.offsetMinutes });
  return won.map((w) => w.offsetMinutes);
}

async function guestIds(tx: Executor, eventId: string): Promise<string[]> {
  const rows = await tx
    .select({ userId: eventParticipant.userId })
    .from(eventParticipant)
    .where(eq(eventParticipant.eventId, eventId));
  return rows.map((r) => r.userId);
}

/** Claims and sends the due slots of one event; returns the counts for the tick's total. */
async function remindOne(
  ev: DueEvent,
  now: Date,
  deps: ReminderDeps,
): Promise<Pick<ReminderTickResult, 'claimed' | 'sent' | 'stale'>> {
  return deps.exec.transaction(async (tx) => {
    const none = { claimed: 0, sent: 0, stale: 0 };
    if (!(await stillDue(tx, ev))) return none;
    const won = await claim(tx, ev.id, ev.offsets);
    const fresh = won.filter(
      (o) => now.getTime() - dueAt(ev.startsAt, o) <= EVENT_REMINDER_GRACE_MS,
    );
    if (fresh.length > 0) {
      const guests = await guestIds(tx, ev.id);
      for (const offset of fresh) {
        await deps.notify(tx, {
          kind: 'event_reminder',
          recipients: guests,
          projectId: ev.projectId,
          ref: { type: 'event', id: ev.id },
          // The key is `eventId:startsAt:offset`; `notify()` prefixes kind and ref, which is the event id.
          sub: `${ev.startsAt.getTime()}:${offset}`,
          payload: {
            title: ev.title,
            startsAt: ev.startsAt.toISOString(),
            ...(ev.projectName ? { projectName: ev.projectName } : {}),
          },
          at: now,
        });
      }
    }
    return { claimed: won.length, sent: fresh.length, stale: won.length - fresh.length };
  });
}

/**
 * One pass of the reminder job at `now`. Safe to run twice at the same `now` and safe to run on
 * two instances at once: the claim row elects one sender per slot. Never throws; an event whose
 * transaction fails is logged by id and retried on the next tick.
 */
export async function runReminderTick(
  now: Date,
  deps: ReminderDeps = { exec: db, notify },
): Promise<ReminderTickResult> {
  const total: ReminderTickResult = { claimed: 0, sent: 0, stale: 0, failed: 0 };
  let due: DueEvent[];
  try {
    due = await selectDueReminders(now, deps.exec);
  } catch (err) {
    logger.warn({ err }, 'event reminder lookup failed');
    return { ...total, failed: 1 };
  }
  for (const ev of due) {
    try {
      const r = await remindOne(ev, now, deps);
      total.claimed += r.claimed;
      total.sent += r.sent;
      total.stale += r.stale;
    } catch (err) {
      total.failed += 1;
      logger.warn({ err, eventId: ev.id }, 'event reminder failed');
    }
  }
  if (total.claimed > 0 || total.failed > 0) logger.info(total, 'event reminders ticked');
  return total;
}

const g = globalThis as typeof globalThis & { __simplePmEventReminders?: { started: boolean } };
// The SSR bundle is a second copy of this module, so the run state lives on globalThis (CLAUDE.md).
g.__simplePmEventReminders ??= { started: false };
const state = g.__simplePmEventReminders;

/**
 * Starts the minute tick. Safe to call twice (the second call is ignored). A tick that is still
 * running when the next one is due is skipped, so a slow database never stacks passes.
 */
export function startEventReminderScheduler(): void {
  if (state.started) return;
  state.started = true;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void runReminderTick(new Date()).finally(() => {
      running = false;
    });
  };
  setInterval(tick, EVENT_REMINDER_TICK_MS).unref?.();
}
