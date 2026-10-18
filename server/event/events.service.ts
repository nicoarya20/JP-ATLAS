/**
 * Event writes (P6 §6 E-03): create, update, cancel and the guest-list changes. Each write is one
 * transaction, so an event and its first guests land together or not at all. Permission comes from
 * the pure policies (`canCreateEvent`, `canManageEvent`, `canCancelEvent`, `canManageParticipants`);
 * this file only loads rows and writes them. Logs carry ids only (C-LOG-1).
 *
 * Moving an event to the Trash is not here: that is E-07, together with restore and the Trash list.
 * No function calls `new Date()`: "now" arrives from the caller, so reminder maths stays testable.
 */
import { and, eq } from 'drizzle-orm';
import {
  canCancelEvent,
  canCreateEvent,
  canManageEvent,
  canManageParticipants,
} from '../access/event.policy';
import type { EventSubject, Membership, Principal } from '../access/types';
import { event, eventParticipant, eventReminder, project } from '../db/schema';
import { logger } from '../logger';
import { EVENT_REMINDER_OFFSETS_MIN, type EventKind, type EventLocationType } from '../pm/enums';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import type { EventDetail, PersonRef } from './events.dto';
import { inviteOnto, loadParticipants } from './events.participants';
import { getEvent } from './events.query';
import { loadEventRow, membershipFor, subjectOf } from './events.sql';
import {
  checkGuests,
  isRefusal,
  type Refusal,
  refuse,
  resolveSpan,
} from './events.validate';

export type CreateEventInput = {
  title: string;
  /** ISO instants; `endsAt` must be after `startsAt` (the DB CHECK enforces it too). */
  startsAt: string;
  endsAt: string;
  kind?: EventKind;
  /** null or absent makes it a personal event, visible only to its creator and guests. */
  projectId?: string | null;
  locationType?: EventLocationType | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  remindersMinutes?: readonly number[];
  /** Guests besides the creator, who is always invited. */
  participantIds?: readonly string[];
};

/** A partial change; a key left out stays as it is, `null` clears a nullable field. */
export type UpdateEventInput = {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  kind?: EventKind;
  locationType?: EventLocationType | null;
  locationText?: string | null;
  meetingUrl?: string | null;
  agenda?: string | null;
  remindersMinutes?: readonly number[];
};

export type EventWriteResult =
  | { ok: true; event: EventDetail }
  | { ok: false; code: PmCode; error?: string };

export type ParticipantWriteResult =
  | { ok: true; participants: PersonRef[] }
  | { ok: false; code: PmCode; error?: string };

/** The project row the create policy reads, or null when the event carries no project. */
async function projectSubjectOf(tx: Tx, projectId: string | null | undefined) {
  if (!projectId) return null;
  const [row] = await tx
    .select({
      id: project.id,
      status: project.status,
      leadId: project.leadId,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
    })
    .from(project)
    .where(eq(project.id, projectId));
  return row ?? undefined;
}

/**
 * Creates an event and its guest list in one transaction. The creator is always a guest, so
 * visibility and the Agenda work from the guest list alone. A project that is in the Trash, or a
 * role below `member` in it, refuses the whole write.
 */
export async function createEvent(
  p: Principal,
  input: CreateEventInput,
): Promise<EventWriteResult> {
  const span = resolveSpan(input);
  if (isRefusal(span)) return span;

  return inTx(async (tx) => {
    const subject = await projectSubjectOf(tx, input.projectId);
    // A project id that does not exist answers like a hidden one: no hint that it might.
    if (subject === undefined) return { ok: false, code: 'NOT_FOUND' };
    const m = await membershipFor(p, input.projectId ?? null, tx);
    const decision = canCreateEvent(p, subject, m);
    if (!decision.ok) return refuse(decision.code);

    const guests = [...new Set([p.id, ...(input.participantIds ?? [])])];
    const bad = await checkGuests(tx, guests);
    if (bad) return bad;

    const [row] = await tx
      .insert(event)
      .values({
        title: input.title,
        kind: input.kind ?? 'meeting',
        projectId: input.projectId ?? null,
        startsAt: span.startsAt,
        endsAt: span.endsAt,
        locationType: input.locationType ?? null,
        locationText: input.locationText ?? null,
        meetingUrl: input.meetingUrl ?? null,
        agenda: input.agenda ?? null,
        remindersMinutes: [...(input.remindersMinutes ?? EVENT_REMINDER_OFFSETS_MIN)],
        createdBy: p.id,
      })
      .returning({ id: event.id });
    await inviteOnto(tx, row.id, guests, p.id);
    logger.info(
      { eventId: row.id, projectId: input.projectId ?? null, guests: guests.length, actorId: p.id },
      'event created',
    );
    return read(p, row.id, tx);
  });
}

/** Loads the row and asks `check`; the shared preamble of every write on an existing event. */
async function gate(
  p: Principal,
  eventId: string,
  tx: Tx,
  check: (s: EventSubject, m: Membership) => { ok: boolean; code?: string },
): Promise<Refusal | { ok: true; subject: EventSubject }> {
  const row = await loadEventRow(eventId, tx);
  if (!row) return { ok: false, code: 'NOT_FOUND' };
  const [guests, m] = await Promise.all([
    tx
      .select({ userId: eventParticipant.userId })
      .from(eventParticipant)
      .where(and(eq(eventParticipant.eventId, eventId), eq(eventParticipant.userId, p.id))),
    membershipFor(p, row.projectId, tx),
  ]);
  const subject = subjectOf(row, guests.length > 0);
  const decision = check(subject, m);
  return decision.ok ? { ok: true, subject } : refuse(decision.code as string);
}

/** Re-reads the event through `getEvent`, so a write answers with exactly what a read would. */
async function read(p: Principal, id: string, tx: Tx): Promise<EventWriteResult> {
  const detail = await getEvent(p, id, tx);
  return detail.ok ? { ok: true, event: detail.event } : { ok: false, code: detail.code };
}

/**
 * Changes an event. Moving `starts_at` deletes the event's `event_reminder` claims, so the
 * reminder tick sends again at the new time instead of treating the old slots as already done.
 */
export async function updateEvent(
  p: Principal,
  eventId: string,
  input: UpdateEventInput,
): Promise<EventWriteResult> {
  return inTx(async (tx) => {
    const gated = await gate(p, eventId, tx, (s, m) => canManageEvent(p, s, m));
    if (!gated.ok) return gated;
    const current = await loadEventRow(eventId, tx);
    if (!current) return { ok: false, code: 'NOT_FOUND' };

    const span = resolveSpan(input, current);
    if (isRefusal(span)) return span;

    await tx
      .update(event)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.locationType !== undefined ? { locationType: input.locationType } : {}),
        ...(input.locationText !== undefined ? { locationText: input.locationText } : {}),
        ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
        ...(input.agenda !== undefined ? { agenda: input.agenda } : {}),
        ...(input.remindersMinutes !== undefined
          ? { remindersMinutes: [...input.remindersMinutes] }
          : {}),
        startsAt: span.startsAt,
        endsAt: span.endsAt,
      })
      .where(eq(event.id, eventId));

    const moved = span.startsAt.getTime() !== current.startsAt.getTime();
    if (moved) {
      // The claim row IS the "already reminded" flag, so dropping it re-arms both offsets (E-04).
      await tx.delete(eventReminder).where(eq(eventReminder.eventId, eventId));
    }
    logger.info({ eventId, moved, actorId: p.id }, 'event updated');
    return read(p, eventId, tx);
  });
}

/** Cancels an event, keeping the row and its reason visible to everyone who had planned around it. */
export async function cancelEvent(
  p: Principal,
  eventId: string,
  reason: string,
  now: Date,
): Promise<EventWriteResult> {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return { ok: false, code: 'REASON_REQUIRED' };
  return inTx(async (tx) => {
    const gated = await gate(p, eventId, tx, (s, m) => canCancelEvent(p, s, m));
    if (!gated.ok) return gated;
    await tx
      .update(event)
      .set({ canceledAt: now, cancelReason: trimmed, canceledBy: p.id })
      .where(eq(event.id, eventId));
    // Nothing is due any more, so pending claims would only keep rows alive for a dead event.
    await tx.delete(eventReminder).where(eq(eventReminder.eventId, eventId));
    logger.info({ eventId, actorId: p.id }, 'event canceled');
    return read(p, eventId, tx);
  });
}

/** Adds guests to an event; re-inviting someone already on the list is a no-op, not an error. */
export async function addParticipants(
  p: Principal,
  eventId: string,
  userIds: readonly string[],
): Promise<ParticipantWriteResult> {
  return inTx(async (tx) => {
    const gated = await gate(p, eventId, tx, (s, m) => canManageParticipants(p, s, m));
    if (!gated.ok) return gated;
    const bad = await checkGuests(tx, userIds);
    if (bad) return bad;
    const added = await inviteOnto(tx, eventId, userIds, p.id);
    logger.info({ eventId, added, actorId: p.id }, 'event participants added');
    return { ok: true, participants: await loadParticipants(eventId, tx) };
  });
}

/** Removes one guest; removing someone who is not on the list is a no-op. */
export async function removeParticipant(
  p: Principal,
  eventId: string,
  userId: string,
): Promise<ParticipantWriteResult> {
  return inTx(async (tx) => {
    const gated = await gate(p, eventId, tx, (s, m) => canManageParticipants(p, s, m));
    if (!gated.ok) return gated;
    await tx
      .delete(eventParticipant)
      .where(and(eq(eventParticipant.eventId, eventId), eq(eventParticipant.userId, userId)));
    logger.info({ eventId, actorId: p.id }, 'event participant removed');
    return { ok: true, participants: await loadParticipants(eventId, tx) };
  });
}
