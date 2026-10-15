/**
 * The one "you cannot even see this" denial the project and task policies share (D8).
 * Pure and type-light on purpose: it sits below both policies, so neither imports the other.
 * It is reported as HTTP 404, never 403, so a hidden record looks the same as a missing one.
 */

/** Codes a hidden record is reported with; the project policy says `NOT_VISIBLE`, the task policy `NOT_FOUND`. */
export type NotVisibleCode = 'NOT_VISIBLE' | 'NOT_FOUND';

/** Denial for a record the principal may not know exists. */
export type NotVisible<C extends NotVisibleCode = NotVisibleCode> = { ok: false; code: C };

/** Build the frozen denial for `code`; shared so callers cannot mutate the next decision. */
export function notVisible<C extends NotVisibleCode>(code: C): Readonly<NotVisible<C>> {
  return Object.freeze<NotVisible<C>>({ ok: false, code });
}
