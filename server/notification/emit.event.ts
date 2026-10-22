/**
 * The Inbox cards the Events module sends (S7 E-04, P6 §6, R07 §3.7): an invitation, a change to the
 * time or place, and a cancellation. Like the task and project hooks, the service that wrote the
 * change calls these inside its own `tx`, so a card follows the write whatever drove it.
 *
 * All three are `info` cards, so `notify()` keeps the people who muted "Kabar terbaru" out. The
 * reminders are not here: they come from the scheduler (`server/event/events.reminders.ts`), which
 * is a caller of `notify()` of its own and has no `by`.
 *
 * Nothing here throws: `notify()` swallows its own failures in a savepoint. The one write that does
 * not go through it, `emitEventGuestRemoved`, is a single DELETE on rows of one person.
 */
import { and, eq } from 'drizzle-orm';
import { event, eventParticipant, notification, project } from '../db/schema';
import type { Executor } from '../pm/tx';
import { notify } from './notification.notify';
import type { EventCardPayload } from './notification.types';

/** What every event hook carries: who acted and when, so a test can pin the bundle window. */
export type EventEmit = {
  /** Who made the change; `notify()` keeps them out of their own Inbox. */
  by: string;
  /** Event time; defaults to now. Services pass their request clock. */
  at?: Date;
};

/** Sub key of the cancellation card: a meeting is called off once, so one card per guest. */
const CANCELED_SUB = 'canceled';

const eventRef = (id: string) => ({ type: 'event', id }) as const;

type Snapshot = {
  projectId: string | null;
  payload: Required<Pick<EventCardPayload, 'title' | 'startsAt'>> & EventCardPayload;
};

/** The card's snapshot, read once; an event that is already gone sends nothing. */
async function snapshotOf(exec: Executor, eventId: string): Promise<Snapshot | null> {
  const [row] = await exec
    .select({
      title: event.title,
      startsAt: event.startsAt,
      projectId: event.projectId,
      projectName: project.name,
    })
    .from(event)
    .leftJoin(project, eq(project.id, event.projectId))
    .where(eq(event.id, eventId));
  if (!row) return null;
  return {
    projectId: row.projectId,
    payload: {
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      ...(row.projectName ? { projectName: row.projectName } : {}),
    },
  };
}

/** Everyone on the guest list; `notify()` drops the actor, so the caller does not have to. */
async function guestsOf(exec: Executor, eventId: string): Promise<string[]> {
  const rows = await exec
    .select({ userId: eventParticipant.userId })
    .from(eventParticipant)
    .where(eq(eventParticipant.eventId, eventId));
  return rows.map((r) => r.userId);
}

/** Someone was put on the guest list: they are told which meeting, and when. */
export async function emitEventInvited(
  exec: Executor,
  eventId: string,
  userIds: readonly string[],
  i: EventEmit,
): Promise<void> {
  if (userIds.length === 0) return;
  const snap = await snapshotOf(exec, eventId);
  if (!snap) return;
  await notify(exec, {
    kind: 'event_invited',
    recipients: userIds,
    actorId: i.by,
    projectId: snap.projectId,
    ref: eventRef(eventId),
    payload: snap.payload,
    at: i.at,
  });
}

/**
 * The time, the place or the title changed: every guest gets one line. No `sub`, so edits within
 * the same hour bundle into "3 perubahan pada acara …" instead of one card per keystroke-save.
 */
export async function emitEventChanged(
  exec: Executor,
  eventId: string,
  i: EventEmit,
): Promise<void> {
  const [snap, guests] = await Promise.all([snapshotOf(exec, eventId), guestsOf(exec, eventId)]);
  if (!snap) return;
  await notify(exec, {
    kind: 'event_changed',
    recipients: guests,
    actorId: i.by,
    projectId: snap.projectId,
    ref: eventRef(eventId),
    payload: snap.payload,
    at: i.at,
  });
}

/** The meeting was called off: every guest is told once, never bundled with an earlier change. */
export async function emitEventCanceled(
  exec: Executor,
  eventId: string,
  i: EventEmit,
): Promise<void> {
  const [snap, guests] = await Promise.all([snapshotOf(exec, eventId), guestsOf(exec, eventId)]);
  if (!snap) return;
  await notify(exec, {
    kind: 'event_canceled',
    recipients: guests,
    actorId: i.by,
    projectId: snap.projectId,
    ref: eventRef(eventId),
    sub: CANCELED_SUB,
    payload: snap.payload,
    at: i.at,
  });
}

/**
 * A guest was taken off the list: the cards they hold for this event are deleted, because they may
 * no longer read its title (the same reasoning as `emitProjectMemberRemoved`). Nobody is told.
 */
export async function emitEventGuestRemoved(
  exec: Executor,
  eventId: string,
  userId: string,
): Promise<void> {
  await exec
    .delete(notification)
    .where(
      and(
        eq(notification.recipientId, userId),
        eq(notification.refType, 'event'),
        eq(notification.refId, eventId),
      ),
    );
}
