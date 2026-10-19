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

/** One tick per calendar month from `from` to `to`, as shares of the `total` days that start at day `first`. */
export function buildMonths(first: number, total: number, from: YearMonth, to: YearMonth) {
  const months: MonthTick[] = [];
  let { y, m } = from;
  while (y < to.y || (y === to.y && m <= to.m)) {
    const start = monthStart(y, m);
    const next = monthStart(y, m + 1);
    months.push({
      key: `${y}-${pad2(m)}`,
      year: y,
      month: m,
      leftPct: ((start - first) / total) * PCT,
      widthPct: ((next - start) / total) * PCT,
    });
    y = m === 12 ? y + 1 : y;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}
