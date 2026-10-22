/**
 * Pure geometry of the project timeline (Gantt): the date range, month ticks, the "today" line and
 * where each project sits, all as percentages of the range so the view scales with its container.
 * Dates are `YYYY-MM-DD` strings; nothing here reads the clock ("today" comes from the server).
 */
import type { IsoDate } from '@server/metrics/dates';
import type { PhaseStatus } from '@server/pm/enums';
import {
  buildMonths,
  dayNum,
  fromDayNum,
  isIso,
  type MonthTick,
  monthStart,
  yearMonthOf,
} from './gantt-dates';

export { type MonthTick, monthLabel } from './gantt-dates';

/** Sizing knobs. The bar minimum keeps a one-day project visible in a year-long range. */
export const GANTT = {
  /** Width of one day in rem; the timeline is at least this wide so months stay readable (scrolls on phones). */
  REM_PER_DAY: 0.3,
  MIN_TIMELINE_REM: 36,
  MAX_TIMELINE_REM: 240,
  MIN_BAR_PCT: 0.6,
} as const;

const PCT = 100;

/** A stage (tahapan) drawn inside the project bar; one without both dates is not drawn. */
export type GanttSegment = {
  id: string;
  startDate: string;
  dueDate: string;
  label: string;
  status: PhaseStatus;
};
/** A milestone (tonggak) marker; it widens the range when it lies outside the project's own dates. */
export type GanttMilestone = { id: string; date: string; label: string; reached: boolean };

export type GanttSource = {
  id: string;
  startDate: string | null;
  dueDate: string | null;
  segments?: readonly GanttSegment[];
  milestones?: readonly GanttMilestone[];
};

export type PlacedSegment = GanttSegment & { leftPct: number; widthPct: number };
export type PlacedMilestone = GanttMilestone & { leftPct: number };

type RowBase = { id: string; segments: PlacedSegment[]; milestones: PlacedMilestone[] };
/** Start and due date known: a bar. Dates are normalised so `startDate <= dueDate`. */
export type GanttBarRow = RowBase & {
  kind: 'bar';
  startDate: IsoDate;
  dueDate: IsoDate;
  leftPct: number;
  widthPct: number;
};
/** Only a due date: a diamond on that day. */
export type GanttDueRow = RowBase & { kind: 'due'; dueDate: IsoDate; leftPct: number };
export type GanttRowLayout = GanttBarRow | GanttDueRow;

export type GanttLayout = {
  /** Whole months around the data; null when no project can be drawn. */
  range: { start: IsoDate; end: IsoDate; totalDays: number } | null;
  timelineRem: number;
  months: MonthTick[];
  /** Position of the "today" line, or null when today lies outside the range. */
  todayPct: number | null;
  rows: GanttRowLayout[];
  /** Ids without a start and due date (or only a start date): listed under "Belum ada tanggal". */
  unscheduled: string[];
};

type Span = { lo: number; hi: number };

function spanOf(a: string | null, b: string | null): Span | null {
  if (!isIso(a) || !isIso(b)) return null;
  const x = dayNum(a);
  const y = dayNum(b);
  return { lo: Math.min(x, y), hi: Math.max(x, y) };
}

/** Every date a source puts on the timeline; only these decide the range. */
function pointsOf(s: GanttSource): number[] {
  const own = spanOf(s.startDate, s.dueDate);
  const due = isIso(s.dueDate) ? [dayNum(s.dueDate)] : [];
  const base = own ? [own.lo, own.hi] : due;
  if (base.length === 0) return [];
  const seg = (s.segments ?? []).flatMap((g) => spanOf(g.startDate, g.dueDate) ?? []);
  const ms = (s.milestones ?? [])
    .filter((m) => isIso(m.date))
    .map((m) => dayNum(m.date as IsoDate));
  return [...base, ...seg.flatMap((g) => [g.lo, g.hi]), ...ms];
}

/** Lays the projects out on one shared timeline; input order is kept. */
export function layoutGantt(sources: readonly GanttSource[], today: string): GanttLayout {
  const points = sources.flatMap(pointsOf);
  const unscheduled = sources.filter((s) => pointsOf(s).length === 0).map((s) => s.id);
  if (points.length === 0) {
    return {
      range: null,
      timelineRem: GANTT.MIN_TIMELINE_REM,
      months: [],
      todayPct: null,
      rows: [],
      unscheduled,
    };
  }
  const min = yearMonthOf(Math.min(...points));
  const max = yearMonthOf(Math.max(...points));
  // Whole months, so the grid always starts on the 1st and ends on the last day of a month.
  const first = monthStart(min.y, min.m);
  const last = monthStart(max.y, max.m + 1) - 1;
  const total = last - first + 1;

  const at = (n: number) => ((n - first) / total) * PCT;
  // The centre of the day, so a marker sits in the middle of its column.
  const mark = (n: number) => ((n - first + 0.5) / total) * PCT;
  const bar = ({ lo, hi }: Span) => {
    const widthPct = Math.min(PCT, Math.max(GANTT.MIN_BAR_PCT, ((hi - lo + 1) / total) * PCT));
    return { widthPct, leftPct: Math.min(at(lo), PCT - widthPct) };
  };
  const extras = (s: GanttSource) => ({
    segments: (s.segments ?? []).flatMap((g): PlacedSegment[] => {
      const span = spanOf(g.startDate, g.dueDate);
      return span ? [{ ...g, ...bar(span) }] : [];
    }),
    milestones: (s.milestones ?? []).flatMap((m): PlacedMilestone[] =>
      isIso(m.date) ? [{ ...m, leftPct: mark(dayNum(m.date)) }] : [],
    ),
  });

  const rows = sources.flatMap((s): GanttRowLayout[] => {
    const own = spanOf(s.startDate, s.dueDate);
    if (own) {
      return [
        {
          id: s.id,
          kind: 'bar',
          startDate: fromDayNum(own.lo),
          dueDate: fromDayNum(own.hi),
          ...bar(own),
          ...extras(s),
        },
      ];
    }
    if (isIso(s.dueDate))
      return [
        {
          id: s.id,
          kind: 'due',
          dueDate: s.dueDate,
          leftPct: mark(dayNum(s.dueDate)),
          ...extras(s),
        },
      ];
    return [];
  });

  const t = isIso(today) ? dayNum(today) : null;
  return {
    range: { start: fromDayNum(first), end: fromDayNum(last), totalDays: total },
    timelineRem: Math.min(
      GANTT.MAX_TIMELINE_REM,
      Math.max(GANTT.MIN_TIMELINE_REM, total * GANTT.REM_PER_DAY),
    ),
    months: buildMonths(first, total, min, max),
    todayPct: t !== null && t >= first && t <= last ? mark(t) : null,
    rows,
    unscheduled,
  };
}
