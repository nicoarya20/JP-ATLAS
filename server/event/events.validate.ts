/**
 * Turns the client's event input into instants and refusals (P6 §6 E-03). Split out of
 * `events.service.ts` so the write paths stay about transactions and the "is this input usable"
 * rules live in one readable place, the way `server/task/task.limits.ts` sits beside its service.
 *
 * Every function here returns a `Refusal` instead of throwing: a bad date or an unknown guest is
 * user input, not an exception, and the route turns the code into its HTTP status (R04).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { user } from '../db/schema';
import type { PmCode } from '../pm/errors';
import type { Tx } from '../pm/tx';

/** A write that cannot proceed: the API code the route maps, plus the sentence the user reads. */
export type Refusal = { ok: false; code: PmCode; error?: string };

/** User-facing refusals of the write paths, in Indonesian and actionable (R04). */
export const EVENT_WRITE_MESSAGES = {
  endsBeforeStarts: 'Jam selesai harus setelah jam mulai.',
  spanRequired: 'Jam mulai dan jam selesai wajib diisi.',
  unknownGuest: 'Ada peserta yang tidak ditemukan atau belum disetujui.',
} as const;

export const invalid = (error: string): Refusal => ({ ok: false, code: 'VALIDATION', error });

export const isRefusal = (v: unknown): v is Refusal =>
  typeof v === 'object' && v !== null && (v as Refusal).ok === false;

/**
 * A policy verdict turned into a write refusal. `NOT_VISIBLE` is the policy's own code and not a
 * `PmCode`, so a hidden event is reported as the 404 a missing one gives (D8).
 */
export function refuse(code: string): Refusal {
  return { ok: false, code: (code === 'NOT_VISIBLE' ? 'NOT_FOUND' : code) as PmCode };
}

/** Parses an ISO instant from the client; anything unparseable is a validation error, never a throw. */
function instantOf(value: string, field: string): Date | Refusal {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? invalid(`Nilai ${field} bukan tanggal yang sah.`) : d;
}

/**
 * The span a write ends up with: the fields it sets, falling back to `current` on an update.
 * One place for the "ends after starts" rule, so create and update refuse identically (the DB
 * CHECK `event_ends_after_starts_check` is the backstop, not the message the user reads).
 */
export function resolveSpan(
  input: { startsAt?: string; endsAt?: string },
  current?: { startsAt: Date; endsAt: Date },
): { startsAt: Date; endsAt: Date } | Refusal {
  const from = input.startsAt ? instantOf(input.startsAt, 'jam mulai') : current?.startsAt;
  if (isRefusal(from)) return from;
  const to = input.endsAt ? instantOf(input.endsAt, 'jam selesai') : current?.endsAt;
  if (isRefusal(to)) return to;
  if (!from || !to) return invalid(EVENT_WRITE_MESSAGES.spanRequired);
  return to.getTime() <= from.getTime()
    ? invalid(EVENT_WRITE_MESSAGES.endsBeforeStarts)
    : { startsAt: from, endsAt: to };
}

/**
 * Rejects guests who do not exist or whose account is not approved, in one query. An id that is
 * simply unknown and one that belongs to a pending account give the same message, so the guest
 * picker cannot be used to probe who has an account here.
 */
export async function checkGuests(tx: Tx, userIds: readonly string[]): Promise<Refusal | null> {
  const wanted = [...new Set(userIds)];
  if (wanted.length === 0) return null;
  const rows = await tx
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, wanted), eq(user.approvalStatus, 'approved')));
  return rows.length === wanted.length ? null : invalid(EVENT_WRITE_MESSAGES.unknownGuest);
}
