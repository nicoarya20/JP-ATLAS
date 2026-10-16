import { describe, expect, it } from 'bun:test';
import {
  QUICK_RANGES,
  quickDueDate,
  quickRangeDates,
  quickRangeLabel,
} from '../app/components/projects/QuickDates';
import type { IsoDate } from '../server/metrics/types';

const d = (s: string) => s as IsoDate; // test-only

describe('quickDueDate', () => {
  it.each([
    ['w1', '2026-10-17', '2026-10-24'],
    ['w2', '2026-10-17', '2026-10-31'],
    ['m1', '2026-10-17', '2026-11-17'],
    ['m3', '2026-10-17', '2027-01-17'],
  ] as const)('%s from %s is %s', (range, start, due) => {
    expect(quickDueDate(d(start), range)).toBe(d(due));
  });

  it('crosses month and year ends for weeks', () => {
    expect(quickDueDate(d('2026-12-28'), 'w1')).toBe(d('2027-01-04'));
    expect(quickDueDate(d('2026-02-20'), 'w2')).toBe(d('2026-03-06'));
  });

  it('clamps 31 Jan + 1 bulan to the last day of February', () => {
    expect(quickDueDate(d('2026-01-31'), 'm1')).toBe(d('2026-02-28'));
    expect(quickDueDate(d('2028-01-31'), 'm1')).toBe(d('2028-02-29'));
  });

  it('clamps month ends for 3 bulan too', () => {
    expect(quickDueDate(d('2026-11-30'), 'm3')).toBe(d('2027-02-28'));
    expect(quickDueDate(d('2026-05-31'), 'm3')).toBe(d('2026-08-31'));
  });

  it('labels the four buttons in plain words', () => {
    expect(QUICK_RANGES.map(quickRangeLabel)).toEqual([
      '1 minggu',
      '2 minggu',
      '1 bulan',
      '3 bulan',
    ]);
  });
});

describe('quickRangeDates', () => {
  const today = d('2026-10-17');

  it("starts at the server's today when no start date is set", () => {
    expect(quickRangeDates(null, today, 'w2')).toEqual({
      startDate: today,
      dueDate: d('2026-10-31'),
    });
  });

  it('keeps a start date the user already picked', () => {
    expect(quickRangeDates('2026-01-31', today, 'm1')).toEqual({
      startDate: d('2026-01-31'),
      dueDate: d('2026-02-28'),
    });
  });
});
