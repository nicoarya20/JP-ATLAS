/** Calendar helpers of the project timeline: day numbers, whole-month ticks and month names (Indonesian). */
import { diffDays, type IsoDate } from '@server/metrics/dates';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EPOCH: IsoDate = '1970-01-01';
const MS_PER_DAY = 86_400_000;
const PCT = 100;
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
];

export type MonthTick = {
  key: string;
  year: number;
  month: number;
  leftPct: number;
  widthPct: number;
  /** How many calendar months this tick covers; more than one only in a coarsened grid (see below). */
  span: number;
};

export type YearMonth = { y: number; m: number };

/** True for a well-formed `YYYY-MM-DD`; anything else is treated as "no date" instead of throwing. */
export const isIso = (v: string | null | undefined): v is IsoDate => !!v && ISO_DATE_RE.test(v);

/** Whole days since 1970-01-01. */
export const dayNum = (d: IsoDate) => diffDays(EPOCH, d);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` of a day number counted from 1970-01-01. */
export function fromDayNum(n: number): IsoDate {
  const d = new Date(n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Day number of the first day of month `m` (1-12); month 13 rolls into January of the next year. */
export const monthStart = (y: number, m: number) => Date.UTC(y, m - 1, 1) / MS_PER_DAY;

export const yearMonthOf = (n: number): YearMonth => {
  const d = new Date(n * MS_PER_DAY);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};

/** "Okt 2026". */
export const monthLabel = (t: Pick<MonthTick, 'year' | 'month'>) =>
  `${MONTHS_SHORT[t.month - 1]} ${t.year}`;

/** Calendar months from `from` to `to` inclusive. */
export const monthCount = (from: YearMonth, to: YearMonth) =>
  (to.y - from.y) * 12 + (to.m - from.m) + 1;

/**
 * One tick per calendar month from `from` to `to`, as shares of the `total` days that start at day
 * `first`. A range wider than `maxTicks` months is coarsened to one tick per `span` months instead
 * of returning tens of thousands of them: a mistyped year used to make this array (and the element
 * the caller drew per tick) big enough to freeze the screen (PD-01).
 */
export function buildMonths(
  first: number,
  total: number,
  from: YearMonth,
  to: YearMonth,
  maxTicks: number,
) {
  const months: MonthTick[] = [];
  const span = Math.max(1, Math.ceil(monthCount(from, to) / maxTicks));
  let { y, m } = from;
  while (y < to.y || (y === to.y && m <= to.m)) {
    const start = monthStart(y, m);
    const next = monthStart(y, m + span);
    const leftPct = ((start - first) / total) * PCT;
    months.push({
      key: `${y}-${pad2(m)}`,
      year: y,
      month: m,
      leftPct,
      // A coarse last block may reach past the range end; it must not widen the timeline.
      widthPct: Math.min(((next - start) / total) * PCT, PCT - leftPct),
      span,
    });
    const advanced = m + span - 1;
    y += Math.floor(advanced / 12);
    m = (advanced % 12) + 1;
  }
  return months;
}
