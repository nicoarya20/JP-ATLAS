/** Pure wording of the leave status on Team cards and profiles ("Cuti sampai 16 Okt"). */
import type { TeamAvailability } from '@server/team/team.dto';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` as day and short Indonesian month, "2026-10-16" → "16 Okt"; anything else comes back unchanged. */
export function shortDate(iso: string): string {
  const m = ISO_DATE.exec(iso);
  const month = m ? MONTHS_SHORT[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month}` : iso;
}

/** The line to show for a person's availability, or null when nothing should be drawn (never "Tersedia"). */
export function availabilityText(a: TeamAvailability | undefined): string | null {
  return a ? `Cuti sampai ${shortDate(a.until)}` : null;
}
