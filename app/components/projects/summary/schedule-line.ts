/** The "Mulai 1 Sep 2026 · tenggat 31 Okt 2026 · sisa 24 hari" line under the progress bars. */
import { diffDays, type IsoDate } from '@server/metrics/dates';
import { formatCalendarDate } from '~/components/ui/DateText';
import { SUMMARY_COPY } from '../projects.copy';

type Span = { startDate: string | null; dueDate: string | null };

/** The pieces that exist (a project may lack either date), joined with a middle dot; null when it has neither. */
export function scheduleLine(span: Span, today: IsoDate): string | null {
  const parts: string[] = [];
  if (span.startDate) parts.push(SUMMARY_COPY.datesStart(formatCalendarDate(span.startDate)));
  if (span.dueDate) {
    parts.push(SUMMARY_COPY.datesDue(formatCalendarDate(span.dueDate)));
    const left = diffDays(today, span.dueDate as IsoDate);
    if (left > 0) parts.push(SUMMARY_COPY.datesLeft(left));
    else parts.push(left === 0 ? SUMMARY_COPY.datesDueToday : SUMMARY_COPY.datesLate(-left));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
