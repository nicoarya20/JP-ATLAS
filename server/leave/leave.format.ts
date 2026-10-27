/**
 * Indonesian wording of a leave range. Pure — no React, no db, no clock — because both halves of
 * the app need the same string: the admin API writes the clashing period into its 409 message
 * (P14 §10 T2) and the cards show the range to the person. `app/lib/leave-view.ts` re-exports these
 * two functions into the browser bundle, so there is one implementation and nothing to drift.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

type Day = { y: string; m: number; d: number };

function parse(iso: string): Day {
  const [y = '', m = '1', d = '1'] = iso.split('-');
  return { y, m: Number(m) - 1, d: Number(d) };
}

/** "16 Okt 2026" for a `YYYY-MM-DD` date. */
export function formatLeaveDay(iso: string): string {
  const { y, m, d } = parse(iso);
  return `${d} ${MONTHS[m] ?? ''} ${y}`;
}

/** "14–16 Okt 2026"; the month and year are written once while they are shared, never abbreviated away. */
export function formatLeaveRange(start: string, end: string): string {
  if (start === end) return formatLeaveDay(start);
  const a = parse(start);
  const b = parse(end);
  if (a.y !== b.y) return `${formatLeaveDay(start)}–${formatLeaveDay(end)}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m]}–${b.d} ${MONTHS[b.m]} ${b.y}`;
  return `${a.d}–${b.d} ${MONTHS[b.m]} ${b.y}`;
}
