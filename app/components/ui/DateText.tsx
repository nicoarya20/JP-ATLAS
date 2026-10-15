import { Text } from '@mantine/core';
import { METRICS } from '@server/metrics/config';
import { diffDays, type IsoDate, isoDateIn } from '@server/metrics/dates';
import { useTimeFormat } from '~/lib/time-format';

type Props = {
  /** `YYYY-MM-DD` for `date`/`due`; an ISO instant for `datetime`/`relative` (and `date`). */
  value: string;
  mode: 'date' | 'datetime' | 'relative' | 'due';
  /** Overrides "today" for `due` (tests, or a server-decided day); defaults to the team zone's today. */
  today?: IsoDate;
  /** A finished task is never "late", so `due` skips the red warning. */
  settled?: boolean;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCALE = 'id-ID';
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC', // the calendar date is already decided; shifting it by a zone would move the day
});
const INVALID = '—';
const DUE_TEXT = {
  today: 'hari ini',
  tomorrow: 'besok',
  later: (days: number) => `${days} hari lagi`,
  late: (days: number) => `terlambat ${days} hari`,
};

/** "31 Okt 2026" for a `YYYY-MM-DD` date, or for an instant read as a day in the team zone. */
export function formatCalendarDate(value: string): string {
  const day = ISO_DATE_RE.test(value) ? value : instantDay(value);
  return day ? dateFmt.format(new Date(`${day}T00:00:00Z`)) : INVALID;
}

function instantDay(value: string): IsoDate | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : isoDateIn(d, METRICS.TIME_ZONE);
}

/** Due date plus the relative note (K16): "31 Okt 2026 · terlambat 2 hari"; `late` drives the warning colour. */
export function describeDue(value: IsoDate, today: IsoDate): { text: string; late: boolean } {
  if (!ISO_DATE_RE.test(value)) return { text: INVALID, late: false };
  const days = diffDays(today, value);
  let note: string;
  if (days === 0) note = DUE_TEXT.today;
  else if (days === 1) note = DUE_TEXT.tomorrow;
  else note = days > 1 ? DUE_TEXT.later(days) : DUE_TEXT.late(-days);
  return { text: `${formatCalendarDate(value)} · ${note}`, late: days < 0 };
}

/** One component for every date on screen, rendered the same on the server and after hydration. */
export function DateText({ value, mode, today, settled }: Props) {
  const t = useTimeFormat();
  if (mode === 'due') {
    // Same root clock as the other modes, so SSR and hydration print the same day.
    const day = today ?? isoDateIn(new Date(t.now()), METRICS.TIME_ZONE);
    const due = describeDue(value, day);
    return (
      <Text
        component="time"
        dateTime={value}
        size="sm"
        c={due.late && !settled ? 'danger' : undefined}
      >
        {due.text}
      </Text>
    );
  }
  const text =
    mode === 'date'
      ? formatCalendarDate(value)
      : mode === 'datetime'
        ? t.dateTime(value)
        : t.relative(value);
  return (
    <Text component="time" dateTime={value} size="sm">
      {text}
    </Text>
  );
}
