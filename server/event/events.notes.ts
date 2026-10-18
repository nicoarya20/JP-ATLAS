/**
 * The typed minutes of an event (P6 §6 E-05): one document per meeting, saved under an optimistic
 * lock so two people taking notes in the same room cannot overwrite each other silently.
 * `event_note.updated_at` IS the version — the writer sends back the value it loaded as
 * `baseUpdatedAt`, the UPDATE matches on it, and zero rows changed means someone else saved first.
 * That answers 409 `NOTE_CONFLICT` together with the newer text, so the UI can offer "Muat versi
 * terbaru" without throwing away what is still being typed (P6 §4).
 *
 * The body is never logged. Minutes quote people verbatim and are the most PII-dense text in the
 * app, so the log lines here carry the event id, the status and a character count, nothing else.
 *
 * Reading is not here: `getEvent` already ships the minutes with the detail, so this file only
 * saves them. No `new Date()` either: `updated_at` is written by the database (insert) and by
 * Drizzle's `$onUpdate` (update), so the version never depends on a clock this module reads.
 */
import { and, eq, sql } from 'drizzle-orm';
import { canWriteNote } from '../access/event.policy';
import type { Principal } from '../access/types';
import { eventNote } from '../db/schema';
import { logger } from '../logger';
import type { EventNoteStatus } from '../pm/enums';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import { EVENT_NOTE_BODY_MAX, type EventDetail } from './events.dto';
import { loadParticipantSummaries } from './events.participants';
import { loadEventRow, membershipFor, subjectOf } from './events.sql';
import { invalid, isRefusal, type Refusal, refuse } from './events.validate';

/** The minutes as every read shows them; taken from the detail DTO so the two cannot drift apart. */
export type EventNoteView = NonNullable<EventDetail['note']>;

/** What the list and the detail put on the badge: no minutes yet, a draft, or confirmed (P6 §4). */
export const EVENT_NOTE_BADGES = ['none', 'draft', 'confirmed'] as const;
export type EventNoteBadge = (typeof EVENT_NOTE_BADGES)[number];

/** The badge of an event: "Belum ada" when there is no document at all, else the document's status. */
export const noteBadge = (status: EventNoteStatus | null): EventNoteBadge => status ?? 'none';

/** User-facing refusals of a save, in Indonesian and actionable (R04). */
export const EVENT_NOTE_MESSAGES = {
  conflict: 'Notulensi ini baru diubah orang lain. Muat versi terbaru, lalu gabungkan tulisanmu.',
  canceled: 'Acara ini sudah dibatalkan, jadi notulensinya tidak bisa diubah lagi.',
  final: 'Notulensi ini sudah ditandai final, jadi tidak bisa diubah lagi.',
  tooLong: `Notulensi maksimal ${EVENT_NOTE_BODY_MAX.toLocaleString('id-ID')} karakter.`,
  badBase: 'Versi notulensi tidak dikenali. Muat versi terbaru, lalu coba lagi.',
} as const;

export type SaveNoteInput = {
  eventId: string;
  body: string;
  /** Defaults to `draft`. `confirmed` closes the document: a confirmed note accepts no more saves. */
  status?: EventNoteStatus;
  /** `updated_at` of the version the writer loaded; null or absent means "there were none yet". */
  baseUpdatedAt?: string | null;
};

/**
 * A save either lands or refuses. A refusal carries `latest` whenever the server knows a newer
 * version exists (`NOTE_CONFLICT`, and a document already marked final), so the UI can show it
 * beside the unsaved text instead of reloading the page.
 */
export type SaveNoteResult =
  | { ok: true; note: EventNoteView; badge: EventNoteBadge }
  | { ok: false; code: PmCode; error?: string; latest?: EventNoteView | null };

/** The columns a save reads back; the id stays internal, the writer is shown by the detail read. */
const noteColumns = {
  body: eventNote.body,
  status: eventNote.status,
  updatedAt: eventNote.updatedAt,
} as const;

type NoteRow = { body: string; status: EventNoteStatus; updatedAt: Date };

const viewOf = (row: NoteRow): EventNoteView => ({
  body: row.body,
  status: row.status,
  updatedAt: row.updatedAt.toISOString(),
});

/** The minutes row of one event, or undefined while nobody has written any. */
async function loadNote(eventId: string, tx: Tx): Promise<NoteRow | undefined> {
  const [row] = await tx.select(noteColumns).from(eventNote).where(eq(eventNote.eventId, eventId));
  return row;
}

/** The 409 a losing writer gets, with whatever version won (null when the document is gone). */
function conflict(latest: NoteRow | undefined): SaveNoteResult {
  return {
    ok: false,
    code: 'NOTE_CONFLICT',
    error: EVENT_NOTE_MESSAGES.conflict,
    latest: latest ? viewOf(latest) : null,
  };
}

/**
 * The version the writer claims to have started from. An absent or null value is the honest "there
 * were no minutes when I opened this"; anything unparseable is user input gone wrong, not a throw.
 */
function parseBase(value: string | null | undefined): Date | null | Refusal {
  if (value === undefined || value === null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? invalid(EVENT_NOTE_MESSAGES.badBase) : d;
}

/**
 * Matches the stored version against the writer's, truncated to milliseconds. The column holds
 * microseconds while a client only ever sees the millisecond ISO string the row was read as, so an
 * exact `=` would make a first save after a database-generated `now()` conflict with itself.
 */
const atVersion = (base: Date) =>
  sql`date_trunc('milliseconds', ${eventNote.updatedAt}) = ${base.toISOString()}::timestamptz`;

const saved = (row: NoteRow): SaveNoteResult => ({
  ok: true,
  note: viewOf(row),
  badge: noteBadge(row.status),
});

/** First save of an event: inserts the document, losing the race to whoever inserted a moment earlier. */
async function insertNote(
  tx: Tx,
  input: { eventId: string; body: string; status: EventNoteStatus; writtenBy: string },
): Promise<SaveNoteResult> {
  const [row] = await tx
    .insert(eventNote)
    .values(input)
    // Two people may write the first minutes at once; the unique index elects one and the other
    // gets the 409 with the winning text, instead of a 500 from the constraint.
    .onConflictDoNothing({ target: eventNote.eventId })
    .returning(noteColumns);
  if (!row) return conflict(await loadNote(input.eventId, tx));
  logNote(input.eventId, input.status, input.body.length, input.writtenBy, 'event note created');
  return saved(row);
}

/** Length, not text: the minutes may quote anyone in the room, so the body never reaches a log (C-LOG-1). */
function logNote(
  eventId: string,
  status: EventNoteStatus,
  length: number,
  actorId: string,
  message: string,
): void {
  logger.info({ eventId, status, length, actorId }, message);
}

/**
 * Saves the minutes of one event. Only a guest, the creator, a manager of its project or an Admin
 * may write them (`canWriteNote`); a cancelled meeting and a document already marked final are
 * frozen, and a save that lost the optimistic lock answers 409 with the newer text.
 */
export async function saveNote(p: Principal, input: SaveNoteInput): Promise<SaveNoteResult> {
  if (input.body.length > EVENT_NOTE_BODY_MAX) return invalid(EVENT_NOTE_MESSAGES.tooLong);
  const base = parseBase(input.baseUpdatedAt);
  if (isRefusal(base)) return base;
  const status = input.status ?? 'draft';

  return inTx(async (tx) => {
    const row = await loadEventRow(input.eventId, tx);
    // A hidden event and a missing one answer the same 404, so neither reveals that the id exists.
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const [guests, m] = await Promise.all([
      loadParticipantSummaries(p.id, [input.eventId], tx),
      membershipFor(p, row.projectId, tx),
    ]);
    const isGuest = guests.get(input.eventId)?.isParticipant ?? false;
    const decision = canWriteNote(p, subjectOf(row, isGuest), m);
    if (!decision.ok) return refuse(decision.code);
    // Not a policy denial: the right to write is unchanged, the meeting itself is off (E-05).
    if (row.canceledAt) {
      return { ok: false, code: 'EVENT_CANCELED', error: EVENT_NOTE_MESSAGES.canceled };
    }

    const current = await loadNote(input.eventId, tx);
    if (!current) {
      // A base version for a document that does not exist means it was removed under the writer.
      return base === null
        ? insertNote(tx, { eventId: input.eventId, body: input.body, status, writtenBy: p.id })
        : conflict(undefined);
    }
    // Final means final: confirmed minutes are the record of the meeting, not a draft to revise.
    if (current.status === 'confirmed') {
      return {
        ok: false,
        code: 'WRONG_STATE',
        error: EVENT_NOTE_MESSAGES.final,
        latest: viewOf(current),
      };
    }
    // No base, but minutes exist: the writer started from a blank box someone has since filled.
    if (base === null) return conflict(current);

    const [row2] = await tx
      .update(eventNote)
      .set({ body: input.body, status, writtenBy: p.id })
      .where(and(eq(eventNote.eventId, input.eventId), atVersion(base)))
      .returning(noteColumns);
    if (!row2) return conflict(await loadNote(input.eventId, tx));
    logNote(input.eventId, status, input.body.length, p.id, 'event note saved');
    return saved(row2);
  });
}
