/** Pure geometry of the project timeline: range, bars, markers, ticks and the "today" line. */
import { describe, expect, it } from 'bun:test';
import {
  GANTT,
  type GanttBarRow,
  type GanttDueRow,
  type GanttSource,
  layoutGantt,
  monthLabel,
} from '../../app/components/projects/gantt-layout';

const src = (id: string, startDate: string | null, dueDate: string | null): GanttSource => ({
  id,
  startDate,
  dueDate,
});
const TODAY = '2026-10-15'; // test-only

describe('layoutGantt range and bars', () => {
  it('pads the range to whole months and places a bar by its days', () => {
    // October 2026 has 31 days: the 11th to the 20th is 10 days starting after 10 days.
    const l = layoutGantt([src('a', '2026-10-11', '2026-10-20')], TODAY);
    expect(l.range).toEqual({ start: '2026-10-01', end: '2026-10-31', totalDays: 31 });
    const bar = l.rows[0] as GanttBarRow;
    expect(bar.kind).toBe('bar');
    expect(bar.leftPct).toBeCloseTo((10 / 31) * 100, 6);
    expect(bar.widthPct).toBeCloseTo((10 / 31) * 100, 6);
  });

  it('spans every project with one shared range and keeps the input order', () => {
    const l = layoutGantt(
      [src('b', '2026-12-05', '2026-12-10'), src('a', '2026-10-02', '2026-11-03')],
      TODAY,
    );
    expect(l.range).toEqual({ start: '2026-10-01', end: '2026-12-31', totalDays: 92 });
    expect(l.rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('draws a one-day project as a thin but visible bar', () => {
    const l = layoutGantt([src('a', '2026-10-05', '2026-10-05')], TODAY);
    expect(l.range?.totalDays).toBe(31);
    expect((l.rows[0] as GanttBarRow).widthPct).toBeCloseTo((1 / 31) * 100, 6);
  });

  it('never lets a bar get thinner than the minimum, nor leave the range', () => {
    const l = layoutGantt(
      [src('a', '2026-01-01', '2026-12-31'), src('z', '2026-12-31', '2026-12-31')],
      TODAY,
    );
    const z = l.rows[1] as GanttBarRow;
    expect(z.widthPct).toBe(GANTT.MIN_BAR_PCT);
    expect(z.leftPct + z.widthPct).toBeLessThanOrEqual(100);
  });

  it('swaps a start date that lies after the due date instead of drawing a negative bar', () => {
    const bar = layoutGantt([src('a', '2026-10-20', '2026-10-11')], TODAY).rows[0] as GanttBarRow;
    expect([bar.startDate, bar.dueDate]).toEqual(['2026-10-11', '2026-10-20']);
    expect(bar.widthPct).toBeGreaterThan(0);
  });

  it('sizes the timeline from the range, within its limits', () => {
    expect(layoutGantt([src('a', '2026-10-01', '2026-10-02')], TODAY).timelineRem).toBe(
      GANTT.MIN_TIMELINE_REM,
    );
    expect(layoutGantt([src('a', '2020-01-01', '2026-12-31')], TODAY).timelineRem).toBe(
      GANTT.MAX_TIMELINE_REM,
    );
    const mid = layoutGantt([src('a', '2026-01-01', '2026-12-31')], TODAY).timelineRem;
    expect(mid).toBeCloseTo(365 * GANTT.REM_PER_DAY, 6);
  });
});

describe('layoutGantt without dates', () => {
  it('lists projects with neither date as unscheduled and draws no bar for them', () => {
    const l = layoutGantt([src('a', null, null), src('b', '2026-10-01', '2026-10-09')], TODAY);
    expect(l.unscheduled).toEqual(['a']);
    expect(l.rows.map((r) => r.id)).toEqual(['b']);
  });

  it('draws a diamond on the due date when there is no start date', () => {
    const l = layoutGantt([src('a', null, '2026-10-16')], TODAY);
    const due = l.rows[0] as GanttDueRow;
    expect(due.kind).toBe('due');
    expect(due.leftPct).toBeCloseTo(((15 + 0.5) / 31) * 100, 6);
    expect(l.unscheduled).toEqual([]);
  });

  it('keeps a project with only a start date in the unscheduled part', () => {
    const l = layoutGantt([src('a', '2026-10-01', null)], TODAY);
    expect(l.unscheduled).toEqual(['a']);
    expect(l.rows).toEqual([]);
  });

  it('has no range at all when nothing can be drawn', () => {
    const l = layoutGantt([src('a', null, null)], TODAY);
    expect(l.range).toBeNull();
    expect(l.months).toEqual([]);
    expect(l.todayPct).toBeNull();
    expect(layoutGantt([], TODAY).unscheduled).toEqual([]);
  });

  it('treats a malformed date as missing instead of throwing', () => {
    const l = layoutGantt([src('a', 'besok', '31/10/2026')], TODAY);
    expect(l.unscheduled).toEqual(['a']);
  });
});

describe('layoutGantt today line', () => {
  const one = [src('a', '2026-10-01', '2026-10-31')];

  it('is drawn in the middle of today inside the range', () => {
    expect(layoutGantt(one, '2026-10-15').todayPct).toBeCloseTo(((14 + 0.5) / 31) * 100, 6);
  });

  it('covers the first and last day of the range', () => {
    expect(layoutGantt(one, '2026-10-01').todayPct).toBeCloseTo((0.5 / 31) * 100, 6);
    expect(layoutGantt(one, '2026-10-31').todayPct).toBeCloseTo((30.5 / 31) * 100, 6);
  });

  it('is left out when today lies before or after the range', () => {
    expect(layoutGantt(one, '2026-09-30').todayPct).toBeNull();
    expect(layoutGantt(one, '2026-11-01').todayPct).toBeNull();
  });

  it('is left out for a malformed today', () => {
    expect(layoutGantt(one, 'hari ini').todayPct).toBeNull();
  });
});

describe('layoutGantt month ticks', () => {
  it('cuts the range into calendar months across a year change', () => {
    const l = layoutGantt([src('a', '2026-11-20', '2027-02-03')], TODAY);
    expect(l.months.map((m) => m.key)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(l.months.map(monthLabel)).toEqual(['Nov 2026', 'Des 2026', 'Jan 2027', 'Feb 2027']);
    expect(l.months[0]?.leftPct).toBe(0);
    const sum = l.months.reduce((n, m) => n + m.widthPct, 0);
    expect(sum).toBeCloseTo(100, 6);
    // Each tick starts where the previous one ends.
    for (const [i, m] of l.months.entries()) {
      const prev = l.months[i - 1];
      if (prev) expect(m.leftPct).toBeCloseTo(prev.leftPct + prev.widthPct, 6);
    }
  });

  it('knows a leap February (2028 has 29 days)', () => {
    const l = layoutGantt([src('a', '2028-02-10', '2028-02-12')], TODAY);
    expect(l.range?.totalDays).toBe(29);
  });
});

describe('layoutGantt stages and milestones', () => {
  const withExtras: GanttSource = {
    ...src('a', '2026-10-01', '2026-10-31'),
    segments: [{ startDate: '2026-10-01', dueDate: '2026-10-10', label: 'Desain', done: true }],
    milestones: [{ date: '2026-10-16', label: 'Persetujuan', reached: false }],
  };

  it('places segments and milestones on the same scale', () => {
    const row = layoutGantt([withExtras], TODAY).rows[0] as GanttBarRow;
    expect(row.segments[0]).toMatchObject({ label: 'Desain', done: true, leftPct: 0 });
    expect(row.segments[0]?.widthPct).toBeCloseTo((10 / 31) * 100, 6);
    expect(row.milestones[0]?.leftPct).toBeCloseTo((15.5 / 31) * 100, 6);
  });

  it('widens the range to include them and is unchanged without them', () => {
    const wide: GanttSource = {
      ...withExtras,
      milestones: [{ date: '2026-12-02', label: 'x', reached: true }],
    };
    expect(layoutGantt([wide], TODAY).range?.end).toBe('2026-12-31');
    const row = layoutGantt([src('a', '2026-10-01', '2026-10-31')], TODAY).rows[0] as GanttBarRow;
    expect(row.segments).toEqual([]);
    expect(row.milestones).toEqual([]);
  });
});
