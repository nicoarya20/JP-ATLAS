/** Pure geometry of the project timeline: range, bars, markers, ticks and the "today" line. */
import { describe, expect, it } from 'bun:test';
import type { ProjectListPhase } from '@server/project/project-plan.dto';
import {
  GANTT,
  type GanttBarRow,
  type GanttDueRow,
  type GanttSource,
  layoutGantt,
  monthGridImage,
  monthLabel,
} from '../../app/components/projects/gantt-layout';
import { ganttPlanOf } from '../../app/components/projects/gantt-plan';

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

  describe('a mistyped year cannot flood the grid (PD-01)', () => {
    // 2026-10 to 9999-12 is 95,679 calendar months; one tick each froze the screen.
    it.each(['2062-12-31', '2099-12-31', '9999-12-31'])(
      '%s stays within the tick budget',
      (due) => {
        const l = layoutGantt([src('a', '2026-10-01', due)], TODAY);
        expect(l.months.length).toBeLessThanOrEqual(GANTT.MAX_MONTH_TICKS);
        expect(l.months.length).toBeGreaterThan(0);
        // Still a real grid: the first tick sits at the left edge and none leaves the range.
        expect(l.months[0]?.leftPct).toBe(0);
        for (const m of l.months) expect(m.leftPct + m.widthPct).toBeLessThanOrEqual(100 + 1e-9);
      },
    );

    it('coarsens by whole months, keeping the ticks in order and the bar drawn', () => {
      const l = layoutGantt([src('a', '2026-10-01', '9999-12-31')], TODAY);
      const span = l.months[0]?.span ?? 0;
      expect(span).toBeGreaterThan(1);
      for (const m of l.months) expect(m.span).toBe(span);
      for (const [i, m] of l.months.entries()) {
        const prev = l.months[i - 1];
        if (prev) expect(m.leftPct).toBeGreaterThan(prev.leftPct);
      }
      expect(l.rows).toHaveLength(1);
    });

    it('still gives one tick per month for an ordinary range', () => {
      const l = layoutGantt([src('a', '2026-11-20', '2027-02-03')], TODAY);
      expect(l.months.map((m) => m.span)).toEqual([1, 1, 1, 1]);
    });
  });
});

describe('monthGridImage', () => {
  it('draws every month line in one background layer, with a band per boundary', () => {
    const l = layoutGantt([src('a', '2026-11-20', '2027-02-03')], TODAY);
    const image = monthGridImage(l.months, 'red');
    expect(image.startsWith('linear-gradient(to right, ')).toBe(true);
    // Four stops per tick (transparent, colour, colour, transparent) and nothing else.
    expect(image.split('red ').length - 1).toBe(l.months.length * 2);
    for (const m of l.months) expect(image).toContain(`calc(${m.leftPct}% - 0.5px)`);
  });

  it('paints nothing when there is no range', () => {
    expect(monthGridImage([], 'red')).toBe('none');
  });
});

describe('layoutGantt stages and milestones', () => {
  const withExtras: GanttSource = {
    ...src('a', '2026-10-01', '2026-10-31'),
    segments: [
      { id: 's1', startDate: '2026-10-01', dueDate: '2026-10-10', label: 'Desain', status: 'done' },
    ],
    milestones: [{ id: 'm1', date: '2026-10-16', label: 'Persetujuan', reached: false }],
  };

  it('places segments and milestones on the same scale as the bar', () => {
    const row = layoutGantt([withExtras], TODAY).rows[0] as GanttBarRow;
    expect(row.segments[0]).toMatchObject({ label: 'Desain', status: 'done', leftPct: 0 });
    expect(row.segments[0]?.widthPct).toBeCloseTo((10 / 31) * 100, 6);
    expect(row.milestones[0]?.leftPct).toBeCloseTo((15.5 / 31) * 100, 6);
  });

  it('puts a segment inside the bar when its dates lie inside the project dates', () => {
    const row = layoutGantt(
      [
        {
          ...withExtras,
          segments: [
            {
              id: 's2',
              startDate: '2026-10-11',
              dueDate: '2026-10-20',
              label: 'Bangun',
              status: 'in_progress',
            },
          ],
        },
      ],
      TODAY,
    ).rows[0] as GanttBarRow;
    const seg = row.segments[0];
    expect(seg?.leftPct).toBeGreaterThanOrEqual(row.leftPct);
    expect((seg?.leftPct ?? 0) + (seg?.widthPct ?? 0)).toBeLessThanOrEqual(
      row.leftPct + row.widthPct + 1e-9,
    );
    expect(seg?.leftPct).toBeCloseTo((10 / 31) * 100, 6);
  });

  it('keeps one id per piece so two stages with the same name stay distinct', () => {
    const row = layoutGantt(
      [
        {
          ...withExtras,
          segments: [
            {
              id: 'a',
              startDate: '2026-10-01',
              dueDate: '2026-10-05',
              label: 'Tahap',
              status: 'done',
            },
            {
              id: 'b',
              startDate: '2026-10-01',
              dueDate: '2026-10-05',
              label: 'Tahap',
              status: 'not_started',
            },
          ],
        },
      ],
      TODAY,
    ).rows[0] as GanttBarRow;
    expect(row.segments.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('widens the range to include them and is unchanged without them', () => {
    const wide: GanttSource = {
      ...withExtras,
      milestones: [{ id: 'm2', date: '2026-12-02', label: 'x', reached: true }],
    };
    expect(layoutGantt([wide], TODAY).range?.end).toBe('2026-12-31');
    const before: GanttSource = {
      ...withExtras,
      milestones: [{ id: 'm3', date: '2026-08-20', label: 'y', reached: true }],
    };
    expect(layoutGantt([before], TODAY).range?.start).toBe('2026-08-01');
    const row = layoutGantt([src('a', '2026-10-01', '2026-10-31')], TODAY).rows[0] as GanttBarRow;
    expect(row.segments).toEqual([]);
    expect(row.milestones).toEqual([]);
  });

  it('widens the range for a stage that ends after the project', () => {
    const late: GanttSource = {
      ...withExtras,
      segments: [
        {
          id: 's9',
          startDate: '2026-10-20',
          dueDate: '2027-01-15',
          label: 'Serah terima',
          status: 'not_started',
        },
      ],
    };
    expect(layoutGantt([late], TODAY).range?.end).toBe('2027-01-31');
  });

  it('does not let a project without dates into the range through its stages', () => {
    const dateless: GanttSource = { ...withExtras, startDate: null, dueDate: null };
    const layout = layoutGantt([dateless], TODAY);
    expect(layout.rows).toEqual([]);
    expect(layout.unscheduled).toEqual(['a']);
  });

  it('draws stages and milestones of a project that only has a due date', () => {
    const row = layoutGantt([{ ...withExtras, startDate: null }], TODAY).rows[0] as GanttDueRow;
    expect(row.kind).toBe('due');
    expect(row.segments).toHaveLength(1);
    expect(row.milestones).toHaveLength(1);
  });
});

describe('ganttPlanOf', () => {
  const phase = (over: Partial<ProjectListPhase> = {}): ProjectListPhase => ({
    id: 'ph-1',
    name: 'Desain',
    startDate: '2026-10-01',
    endDate: '2026-10-10',
    status: 'in_progress',
    ...over,
  });

  it('gives nothing for a list item without a plan', () => {
    expect(ganttPlanOf(undefined)).toEqual({ segments: [], milestones: [] });
  });

  it('draws only phases with both dates', () => {
    const plan = ganttPlanOf({
      phases: [
        phase(),
        phase({ id: 'ph-2', name: 'Tanpa akhir', endDate: null }),
        phase({ id: 'ph-3', name: 'Tanpa mulai', startDate: null }),
        phase({ id: 'ph-4', name: 'Tanpa tanggal', startDate: null, endDate: null }),
      ],
      milestones: [],
    });
    expect(plan.segments).toEqual([
      {
        id: 'ph-1',
        label: 'Desain',
        startDate: '2026-10-01',
        dueDate: '2026-10-10',
        status: 'in_progress',
      },
    ]);
  });

  it('marks a milestone reached only when it has a reached time', () => {
    const plan = ganttPlanOf({
      phases: [],
      milestones: [
        {
          id: 'm1',
          title: 'Serah terima',
          dueDate: '2026-10-30',
          reachedAt: '2026-10-29T03:00:00.000Z',
          phaseId: null,
        },
        { id: 'm2', title: 'Persetujuan', dueDate: '2026-10-16', reachedAt: null, phaseId: 'ph-1' },
      ],
    });
    expect(plan.milestones).toEqual([
      { id: 'm1', label: 'Serah terima', date: '2026-10-30', reached: true },
      { id: 'm2', label: 'Persetujuan', date: '2026-10-16', reached: false },
    ]);
  });
});
