/**
 * Reads of the Inbox (S3 I04, P5 §5.4): one keyset page per lane, the two counts behind the bell and
 * the two "mark read" writes. Every statement filters `recipient_id` in SQL and nothing here reads a
 * `userId` from the request (R12 C-INB-1). Reading re-checks project access too, so a card written
 * while someone was a member stops showing the moment they are taken off the project.
 */
import { and, desc, eq, getTableColumns, isNull, type SQL, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { notification, projectMember, user } from '../db/schema';
import { METRICS } from '../metrics/config';
import { diffDays, isoDateIn } from '../metrics/dates';
import { isAdminRole } from '../permissions';
import { decodeCursor, encodeCursor } from '../pm/keyset';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';
import type { Executor } from '../pm/tx';
import { refNotTrashed } from './notification.alive';
import { cardButton, cardSentence, isNotificationKind } from './notification.catalog';
import type { NotificationLane } from './notification.types';

/** Day bucket of a card, decided by the server from `METRICS.TIME_ZONE`, never by the browser. */
export type InboxGroup = 'today' | 'yesterday' | 'older';
export type InboxActor = { id: string; name: string; image: string | null };

export type InboxItem = {
  id: string;
  kind: string;
  lane: NotificationLane;
  /** Null when the system acted or the account was removed. */
  actor: InboxActor | null;
  ref: { type: string; id: string; number: number | null };
  payload: Payload;
  bundleCount: number;
  read: boolean;
  group: InboxGroup;
  createdAt: string;
  updatedAt: string;
  /** Where the card's single button goes, plus the Indonesian copy for it (null for an unknown kind). */
  href: string;
  sentence: string | null;
  button: string | null;
};

export type ListInboxInput = { lane: NotificationLane; limit?: number; cursor?: string };
export type ListInboxResult =
  | { ok: true; items: InboxItem[]; nextCursor: string | null }
  // A broken cursor is `VALIDATION` (422) to the decoder; the route maps it to the 400 `BAD_CURSOR`
  // R04 froze for a cursor the client must drop, exactly as the task list does.
  | { ok: false; code: 'BAD_CURSOR' };

export type InboxCounts = { action: number; infoUnread: number };

const clampLimit = (limit?: number) =>
  Math.min(Math.max(1, Math.floor(limit ?? PAGE_LIMIT_DEFAULT)), PAGE_LIMIT_MAX);

/** `created_at` orders the work queue, `updated_at` the news lane (bundling bumps it). */
const sortColumn = (lane: NotificationLane) =>
  lane === 'action' ? notification.createdAt : notification.updatedAt;

/**
 * Cards whose project the caller may still see: account cards (no project) always, project cards only
 * while a membership row exists; an Admin outranks the project role (`access/level.ts` K6).
 */
function visibleTo(p: Principal, projectIdExpr: SQL): SQL {
  if (isAdminRole(p.appRole)) return sql`true`;
  return sql`(${projectIdExpr} IS NULL OR EXISTS (
    SELECT 1 FROM ${projectMember} pm
     WHERE pm.project_id = ${projectIdExpr} AND pm.user_id = ${p.id}))`;
}

const projectIdOf = sql`${notification.projectId}`;
/** Open work (`action`, not resolved) or the news lane as it stands. */
const laneFilter = (lane: NotificationLane) =>
  lane === 'action'
    ? and(eq(notification.lane, 'action'), isNull(notification.resolvedAt))
    : eq(notification.lane, 'info');

function groupOf(at: Date, today: string): InboxGroup {
  // Whole days from the card's team-zone date to today, so 0 is today and 1 is yesterday.
  const days = diffDays(isoDateIn(at, METRICS.TIME_ZONE), today);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : 'older';
}

/** Where the card's button leads; falls back to the Inbox itself for a ref with no page yet. */
function hrefOf(refType: string, refId: string, number: number | null): string {
  if (refType === 'task' || refType === 'comment')
    return number === null ? '/app/tasks' : `/app/tasks/${number}`;
  if (refType === 'project') return `/app/projects/${refId}`;
  if (refType === 'event') return `/app/events/${refId}`;
  return refType === 'user' ? '/dashboard/users' : '/app/inbox';
}

type Payload = Record<string, unknown>;
const numberOf = (p: Payload) => (typeof p.number === 'number' ? p.number : null);
const text = (p: Payload, key: string) =>
  typeof p[key] === 'string' ? (p[key] as string) : undefined;

/** Copy for a stored kind; a kind this build does not know renders without a sentence, not with a crash. */
function copyOf(
  kind: string,
  payload: Record<string, unknown>,
  actor: string | null,
  count: number,
) {
  if (!isNotificationKind(kind)) return { sentence: null, button: null };
  const vars = {
    actor,
    count,
    number: numberOf(payload) ?? undefined,
    title: text(payload, 'title'),
    project: text(payload, 'projectName'),
    name: text(payload, 'name'),
    role: text(payload, 'role'),
  };
  return { sentence: cardSentence(kind, vars), button: cardButton(kind) };
}

/** One keyset page of the caller's cards in `lane`, newest first, in one query (actor joined in). */
export async function listInbox(
  p: Principal,
  input: ListInboxInput,
  now: Date,
  exec: Executor = db,
): Promise<ListInboxResult> {
  const limit = clampLimit(input.limit);
  const column = sortColumn(input.lane);
  let after: SQL | undefined;
  if (input.cursor !== undefined) {
    const cursor = decodeCursor(input.cursor);
    if (!cursor.ok || typeof cursor.key.sortValue !== 'string')
      return { ok: false, code: 'BAD_CURSOR' };
    const { sortValue, id } = cursor.key;
    after = sql`(${column}, ${notification.id}) < (${sortValue}::timestamptz, ${id})`;
  }

  const rows = await exec
    .select({
      card: getTableColumns(notification),
      actor: { id: user.id, name: user.name, image: user.image },
      // `::text` keeps the microsecond precision a JS Date would round away in the cursor.
      sortKey: sql<string>`${column}::text`,
    })
    .from(notification)
    // LEFT JOIN: `actor_id` is NULL for a system card and for an actor whose account was removed.
    .leftJoin(user, eq(user.id, notification.actorId))
    .where(
      and(
        eq(notification.recipientId, p.id),
        laneFilter(input.lane),
        visibleTo(p, projectIdOf),
        refNotTrashed,
        after,
      ),
    )
    .orderBy(desc(column), desc(notification.id))
    // One extra row says whether another page exists, without a second count query.
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const today = isoDateIn(now, METRICS.TIME_ZONE);
  const items = page.map(({ card, actor }): InboxItem => {
    const payload = (card.payload ?? {}) as Payload;
    const number = numberOf(payload);
    const at = input.lane === 'action' ? card.createdAt : card.updatedAt;
    const name = actor?.id ? (actor.name ?? '') : null;
    return {
      id: card.id,
      kind: card.kind,
      lane: card.lane,
      actor: actor?.id ? { id: actor.id, name: name ?? '', image: actor.image } : null,
      ref: { type: card.refType, id: card.refId, number },
      payload,
      bundleCount: card.bundleCount,
      read: card.readAt !== null,
      group: groupOf(at, today),
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
      href: hrefOf(card.refType, card.refId, number),
      ...copyOf(card.kind, payload, name, card.bundleCount),
    };
  });
  return {
    ok: true,
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last.sortKey, last.card.id) : null,
  };
}

/**
 * How many open action cards the caller has: the bell number and the menu badge, and by contract the
 * length of the `lane=action` list. One index-only count, never cached — a cached promise would hand
 * one user's number to the next request (see `sidebar-badges.ts`).
 */
export async function inboxActionCount(p: Principal, exec: Executor = db): Promise<number> {
  const [row] = await exec
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, p.id),
        laneFilter('action'),
        visibleTo(p, projectIdOf),
        refNotTrashed,
      ),
    );
  return row?.n ?? 0;
}

/** The bell payload: open work plus unread news. Two counts, both index-only, neither cached. */
export async function inboxCounts(p: Principal, exec: Executor = db): Promise<InboxCounts> {
  const action = await inboxActionCount(p, exec);
  const [unread] = await exec
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, p.id),
        eq(notification.lane, 'info'),
        isNull(notification.readAt),
        visibleTo(p, projectIdOf),
        refNotTrashed,
      ),
    );
  return { action, infoUnread: unread?.n ?? 0 };
}

/**
 * Marks one card read; false when it is someone else's or does not exist, so the route answers the
 * same 404 for both. Idempotent: the first read time is kept.
 */
export async function markRead(p: Principal, id: string, exec: Executor = db): Promise<boolean> {
  const rows = await exec
    .update(notification)
    .set({
      readAt: sql`coalesce(${notification.readAt}, now())`,
      // Pinned on purpose: `updated_at` orders the news lane, so reading a card must not move it.
      updatedAt: sql`${notification.updatedAt}`,
    })
    .where(and(eq(notification.id, id), eq(notification.recipientId, p.id)))
    .returning({ id: notification.id });
  return rows.length > 0;
}

/** Marks every unread news card of the caller read and returns how many changed. */
export async function markAllRead(p: Principal, exec: Executor = db): Promise<number> {
  const rows = await exec
    .update(notification)
    .set({ readAt: sql`now()`, updatedAt: sql`${notification.updatedAt}` })
    .where(
      and(
        eq(notification.recipientId, p.id),
        eq(notification.lane, 'info'),
        isNull(notification.readAt),
      ),
    )
    .returning({ id: notification.id });
  return rows.length;
}
