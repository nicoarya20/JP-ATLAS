/** Timeline maths behind the Gantt view of Proyek. */
import { describe, expect, it } from 'bun:test';
import { PROJECTS } from '../app/components/projects/projects.dummy';
import {
  addDays,
  barBox,
  monthSpans,
  PX_PER_DAY,
  rangeOf,
  tickSpans,
  totalDays,
} from '../app/components/projects/projects.gantt';

const range = () => {
  const r = rangeOf(PROJECTS);
  if (!r) throw new Error('expected a range');
  return r;
};

describe('gantt scale', () => {
  it('covers whole months from the earliest start to the latest due date', () => {
    expect(range()).toEqual({ start: '2026-08-01', end: '2026-10-31' });
    expect(rangeOf([])).toBeNull();
  });

  it('keeps every project start before its due date', () => {
    for (const p of PROJECTS) expect(p.start <= p.due).toBe(true);
  });

  it('adds days across month ends and backwards', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('splits the header into months whose days add up to the range', () => {
    const spans = monthSpans(range());
    expect(spans.map((s) => s.days)).toEqual([31, 30, 31]);
    expect(spans.reduce((n, s) => n + s.days, 0)).toBe(totalDays(range()));
    expect(spans[0]?.label).toBe('Agustus 2026');
  });

  it('builds day, week (Monday-first) and no month ticks, all covering the range', () => {
    const r = range();
    expect(tickSpans(r, 'day')).toHaveLength(totalDays(r));
    expect(tickSpans(r, 'month')).toEqual([]);
    const weeks = tickSpans(r, 'week');
    expect(weeks.reduce((n, s) => n + s.days, 0)).toBe(totalDays(r));
    // 1 Aug 2026 is a Saturday, so the first partial week is Sat+Sun only.
    expect(weeks[0]?.days).toBe(2);
    expect(weeks[1]?.days).toBe(7);
  });

  it('positions a bar by start offset and inclusive length, scaled by zoom', () => {
    const atlas = PROJECTS.find((p) => p.id === 'atlas');
    if (!atlas) throw new Error('missing atlas');
    const day = barBox('2026-08-01', atlas, 'day');
    expect(day.left).toBe(23 * PX_PER_DAY.day);
    expect(day.width).toBe(69 * PX_PER_DAY.day);
    expect(barBox('2026-08-01', atlas, 'month').width).toBe(69 * PX_PER_DAY.month);
  });
});
