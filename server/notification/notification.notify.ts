/**
 * `notify()` — the only writer of Inbox cards (S3 I03, P5 §5.3 butir 1-5).
 *
 * Four rules the callers rely on:
 * 1. It never throws. Everything runs in a savepoint (`exec.transaction`), so a failed card rolls
 *    back only itself and the domain write that opened the transaction still commits; the failure
 *    is logged as `{ err, kind }` — no title, no excerpt, no person.
 * 2. It is idempotent: one row per `(recipient_id, dedupe_key)`. An `action` card that already
 *    exists stays as it is; an `info` card is bundled (`bundle_count + 1`, unread again).
 * 3. It filters the recipients itself (never the caller): the actor, accounts that cannot sign in,
 *    people without access to the project and, for `info`, anyone who muted the kind's category
 *    ("Kabar terbaru", or the event reminders).
 * 4. Two queries per call: one for the filter, one for the insert.
 */
import { sql } from 'drizzle-orm';
import { notification } from '../db/schema';
import { logger } from '../logger';
import type { Executor, Tx } from '../pm/tx';
// Longest title the app accepts anywhere today; a snapshot is cut, never rejected.
import { TASK_TITLE_MAX } from '../task/task.limits';
import { NOTIFICATION_KINDS, prefCategoryOf } from './notification.catalog';
import { filterRecipients } from './notification.recipients';
import {
  type AnyNotificationPayload,
  type NotificationKind,
  type NotificationPayload,
  type NotificationRef,
  PAYLOAD_EXCERPT_MAX,
} from './notification.types';

/** Bundle window of an `info` card without its own `sub`: the wall-clock hour (P5 §5.2, K-6 UTC). */
const HOUR_MS = 3_600_000;

/**
 * Payload fields a card may carry, with the length each one is cut to. Anything else is dropped
 * before the write, so a caller cannot leak a field the Inbox has no business showing (R12);
 * a new payload field in `notification.types.ts` has to be listed here to survive.
 */
const PAYLOAD_FIELDS: Readonly<Record<string, number | null>> = Object.freeze({
  title: TASK_TITLE_MAX,
  number: null,
  projectName: TASK_TITLE_MAX,
  excerpt: PAYLOAD_EXCERPT_MAX,
  name: TASK_TITLE_MAX,
  role: null,
  startsAt: null,
  // Leave cards: the range and the numbers the approver decides on, and the outcome the requester reads.
  startDate: null,
  endDate: null,
  days: null,
  dueTasks: null,
  decision: null,
  // `leave_recorded` (P14 D5): which of the two things an Admin did to the period.
  change: null,
});

export type NotifyInput<K extends NotificationKind = NotificationKind> = {
  kind: K;
  /** Candidate recipients; duplicates and the actor are removed here, not by the caller. */
  recipients: readonly string[];
  actorId?: string | null;
  /** The project that gates the card, or null/absent for an account card. */
  projectId?: string | null;
  ref: NotificationRef;
  /**
   * Event identity inside the ref. **Contract for the emit helpers (I05-I07): a card that must not
   * bundle sends the `task_activity` row id here** — that is what makes two distinct events on one
   * task two cards instead of one. Left out, an `info` card bundles per hour (the "5 komentar baru"
   * card) and an `action` card is one per ref, which is what "the card is the event" means.
   */
  sub?: string;
  payload: NotificationPayload<K>;
  /** Event time; defaults to now. Also picks the bundle window, so tests can pin it. */
  at?: Date;
};

/**
 * `inserted` = new cards, `bundled` = cards an existing row already covered (raised for `info`),
 * `skipped` = recipients that got nothing because the write failed or the kind is not shipped yet.
 */
export type NotifyResult = { inserted: number; bundled: number; skipped: number };

const NOTHING: NotifyResult = { inserted: 0, bundled: 0, skipped: 0 };

const cut = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

/** Known fields only, each cut to its limit; everything else is left out of the stored card. */
function safePayload(payload: AnyNotificationPayload): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(PAYLOAD_FIELDS)) {
    const value = (payload as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    safe[key] = max !== null && typeof value === 'string' ? cut(value, max) : value;
  }
  return safe;
}

/** `<kind>:<refType>:<refId>[:<sub>]`, the identity `ON CONFLICT` deduplicates on. */
function dedupeKeyOf(input: NotifyInput, lane: 'action' | 'info', at: Date): string {
  const base = `${input.kind}:${input.ref.type}:${input.ref.id}`;
  const sub =
    input.sub ?? (lane === 'info' ? String(Math.floor(at.getTime() / HOUR_MS)) : undefined);
  return sub ? `${base}:${sub}` : base;
}

/**
 * Writes one card per recipient and reports what happened. Call it from the service that performed
 * the change, inside the same `tx`; never from a controller (P5 §5.3 butir 4).
 */
export async function notify<K extends NotificationKind>(
  exec: Executor,
  input: NotifyInput<K>,
): Promise<NotifyResult> {
  const meta = NOTIFICATION_KINDS[input.kind];
  const actorId = input.actorId ?? null;
  const candidates = [...new Set(input.recipients)].filter((id) => id !== '' && id !== actorId);
  if (candidates.length === 0) return NOTHING;
  if (!meta.shipped) {
    // A reserved kind (S4/S7) must not appear in anyone's Inbox before its feature ships.
    logger.warn({ kind: input.kind }, 'notification kind not shipped');
    return { ...NOTHING, skipped: candidates.length };
  }

  const at = input.at ?? new Date();
  const dedupeKey = dedupeKeyOf(input, meta.lane, at);
  const payload = safePayload(input.payload);
  try {
    return await exec.transaction(async (tx: Tx) => {
      const recipients = await filterRecipients(tx, {
        ids: candidates,
        actorId,
        projectId: input.projectId ?? null,
        lane: meta.lane,
        category: prefCategoryOf(input.kind),
      });
      if (recipients.length === 0) return NOTHING;
      const values = recipients.map((recipientId) => ({
        recipientId,
        actorId,
        projectId: input.projectId ?? null,
        lane: meta.lane,
        kind: input.kind,
        refType: input.ref.type,
        refId: input.ref.id,
        dedupeKey,
        payload,
        createdAt: at,
        updatedAt: at,
      }));
      return meta.lane === 'action'
        ? await insertAction(tx, values)
        : await insertInfo(tx, values, at);
    });
  } catch (err) {
    // The domain transaction keeps going: only the savepoint was rolled back.
    logger.warn({ err, kind: input.kind }, 'notification skipped');
    return { ...NOTHING, skipped: candidates.length };
  }
}

type CardValues = Array<typeof notification.$inferInsert>;

/** `action`: the open card already stands for the event, so a second one is simply not written. */
async function insertAction(tx: Tx, values: CardValues): Promise<NotifyResult> {
  const rows = await tx
    .insert(notification)
    .values(values)
    .onConflictDoNothing({ target: [notification.recipientId, notification.dedupeKey] })
    .returning({ id: notification.id });
  return { inserted: rows.length, bundled: values.length - rows.length, skipped: 0 };
}

/**
 * `info`: a repeat of the same event in the same window raises the counter, refreshes the snapshot
 * and marks the card unread again, so "5 perubahan di tugas #12" is one line in Kabar terbaru.
 */
async function insertInfo(tx: Tx, values: CardValues, at: Date): Promise<NotifyResult> {
  const rows = await tx
    .insert(notification)
    .values(values)
    .onConflictDoUpdate({
      target: [notification.recipientId, notification.dedupeKey],
      set: {
        bundleCount: sql`${notification.bundleCount} + 1`,
        updatedAt: at,
        readAt: sql`NULL`,
        payload: sql`excluded.payload`,
      },
    })
    .returning({ bundleCount: notification.bundleCount });
  // A fresh row is the only one that can still be at 1, so it tells insert from bundle.
  const inserted = rows.filter((row) => row.bundleCount === 1).length;
  return { inserted, bundled: rows.length - inserted, skipped: 0 };
}
