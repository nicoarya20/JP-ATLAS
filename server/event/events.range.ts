/**
 * The optional calendar window of `GET /events` (A9). Pure: the month and week grids of a calendar
 * need every event that *touches* a range of days, which the `upcoming`/`past` tabs cannot give —
 * they cut on `now`, so the running month is always half missing.
 *
 * Only the parsing lives here. The SQL that turns a window into day boundaries is `inRange` in
 * `events.sql.ts`, and it computes those boundaries in the team zone, never in UTC.
 */
import { diffDays, isInCalendarRange } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';

/**
 * Widest window one request may ask for, in whole days, both ends counted. A month grid with its
 * padding weeks needs 42 days and a quarter view 92, so this covers what a calendar draws while
 * refusing "give me ten years" — a range is a filter, not an export (R13).
 */
export const EVENT_RANGE_DAYS_MAX = 92;

/** A calendar window in the team zone; both ends are inclusive dates, never instants. */
export type EventRange = { from: IsoDate; to: IsoDate };

/** Either the window the caller asked for, `undefined` when they asked for none, or the refusal. */
export type EventRangeResult =
  | { ok: true; range: EventRange | undefined }
  | { ok: false; error: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A real calendar day in `YYYY-MM-DD`. The round trip rejects what the shape alone accepts:
 * `2026-02-31` parses and silently becomes 3 March, which would widen the window by two days.
 */
function isCalendarDay(s: string): s is IsoDate {
  if (!ISO_DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // `2026-13-01` parses to an Invalid Date, whose `toISOString` throws: check before formatting.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Reads `?from=&to=` of `GET /events`. Both ends or neither (half a window is a mistake, not a
 * default), each a real day inside the accepted calendar years, `to` not before `from`, and at most
 * `EVENT_RANGE_DAYS_MAX` days apart. Never throws: a refusal is a value the route turns into a 422.
 */
export function parseEventRange(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): EventRangeResult {
  // An empty `?from=` is "no window", not a malformed one: a client that builds its query string
  // from optional state sends the key with nothing in it, and that must not become a 422.
  const from = rawFrom?.trim() || undefined;
  const to = rawTo?.trim() || undefined;
  if (from === undefined && to === undefined) return { ok: true, range: undefined };
  if (from === undefined || to === undefined) {
    return { ok: false, error: 'Isi `from` dan `to` sekaligus untuk menyaring rentang tanggal.' };
  }
  if (!isCalendarDay(from) || !isCalendarDay(to)) {
    return { ok: false, error: 'Tanggal rentang harus berformat YYYY-MM-DD.' };
  }
  if (!isInCalendarRange(from) || !isInCalendarRange(to)) {
    return { ok: false, error: 'Tanggal rentang di luar jangkauan kalender yang didukung.' };
  }
  const days = diffDays(from, to) + 1;
  if (days < 1) {
    return { ok: false, error: 'Tanggal akhir rentang tidak boleh sebelum tanggal awalnya.' };
  }
  if (days > EVENT_RANGE_DAYS_MAX) {
    return {
      ok: false,
      error: `Rentang tanggal paling lebar ${EVENT_RANGE_DAYS_MAX} hari; minta per bulan.`,
    };
  }
  return { ok: true, range: { from, to } };
}
