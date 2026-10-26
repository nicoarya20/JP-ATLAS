/**
 * Pure view logic of the leave UI: date ranges and labels. No React and no clock — "today" always
 * arrives from the server, so every rule is testable on any date. The form helpers and the
 * four-state card view left with the application flow (P14 CU-02/CU-05); what stays is wording the
 * Ketersediaan card and the Inbox cards share.
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

export const leaveDaysLabel = (days: number) => `${days} hari`;

/** "3 tugas jatuh tempo selama cuti", or the sentence for none. */
export function dueTasksLabel(count: number): string {
  return count > 0 ? `${count} tugas jatuh tempo selama cuti` : 'Tidak ada tugas jatuh tempo';
}
