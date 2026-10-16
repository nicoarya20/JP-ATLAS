import { diffDays, type IsoDate } from '@server/metrics/dates';
import type { DummyProject } from './projects.dummy';

export type Zoom = 'day' | 'week' | 'month';
export const ZOOMS: { value: Zoom; label: string }[] = [
  { value: 'day', label: 'Hari' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
];
/** Horizontal scale per zoom level; the whole timeline width is days × this. */
export const PX_PER_DAY: Record<Zoom, number> = { day: 32, week: 14, month: 5 };

export type Span = { label: string; days: number };

const MS_PER_DAY = 86_400_000;
const MONDAY = 1;
const DAYS_IN_WEEK = 7;
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10) as IsoDate;
const monthFmt = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** `iso` moved by `n` days (negative goes back). */
export function addDays(iso: string, n: number): IsoDate {
  return toIso(at(iso).getTime() + n * MS_PER_DAY);
}

/** Whole months that cover every project: first day of the earliest start's month to the last day of the latest due month. */
export function rangeOf(rows: readonly DummyProject[]): { start: IsoDate; end: IsoDate } | null {
  if (rows.length === 0) return null;
  const starts = rows.map((p) => p.start).sort();
  const ends = rows.map((p) => p.due).sort();
  const first = at(starts[0] ?? '');
  const last = at(ends[ends.length - 1] ?? '');
  return {
    start: toIso(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)),
    end: toIso(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0)),
  };
}

/** Days in the range, both ends included. */
export const totalDays = (r: { start: IsoDate; end: IsoDate }) => diffDays(r.start, r.end) + 1;

/** Top header row: one span per calendar month. */
export function monthSpans(r: { start: IsoDate; end: IsoDate }): Span[] {
  const out: Span[] = [];
  let cursor: string = r.start;
  while (cursor <= r.end) {
    const d = at(cursor);
    const monthEnd = toIso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    const last = monthEnd < r.end ? monthEnd : r.end;
    out.push({ label: monthFmt.format(d), days: diffDays(cursor, last) + 1 });
    cursor = addDays(last, 1);
  }
  return out;
}

/** Second header row: a cell per day, per week (starting Monday), or none for the month zoom. */
export function tickSpans(r: { start: IsoDate; end: IsoDate }, zoom: Zoom): Span[] {
  if (zoom === 'month') return [];
  const total = totalDays(r);
  if (zoom === 'day') {
    return Array.from({ length: total }, (_, i) => ({
      label: String(at(addDays(r.start, i)).getUTCDate()),
      days: 1,
    }));
  }
  const out: Span[] = [];
  let offset = 0;
  while (offset < total) {
    const day = addDays(r.start, offset);
    const untilMonday =
      (DAYS_IN_WEEK - ((at(day).getUTCDay() - MONDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK)) %
        DAYS_IN_WEEK || DAYS_IN_WEEK;
    const days = Math.min(untilMonday, total - offset);
    out.push({ label: shortFmt.format(at(day)), days });
    offset += days;
  }
  return out;
}

/** Pixel position of a project bar on the timeline. */
export function barBox(
  rangeStart: IsoDate,
  p: Pick<DummyProject, 'start' | 'due'>,
  zoom: Zoom,
): { left: number; width: number } {
  const px = PX_PER_DAY[zoom];
  return {
    left: diffDays(rangeStart, p.start) * px,
    width: (diffDays(p.start, p.due) + 1) * px,
  };
}
