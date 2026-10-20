/** Start of the week for "selesai minggu ini": Monday first, across month and year ends. */
import { describe, expect, it } from 'bun:test';
import { weekStartDate } from '../../server/metrics/week';

describe('weekStartDate', () => {
  it.each([
    ['2026-10-19', '2026-10-19'], // Monday is its own start
    ['2026-10-20', '2026-10-19'], // Tuesday
    ['2026-10-25', '2026-10-19'], // Sunday still belongs to the week that began on Monday
    ['2026-10-26', '2026-10-26'], // next Monday
    ['2026-11-01', '2026-10-26'], // week crossing a month end
    ['2027-01-01', '2026-12-28'], // week crossing a year end (a Friday)
    ['2028-03-01', '2028-02-28'], // leap year
  ])('%s starts its week on %s', (today, monday) => {
    expect(weekStartDate(today)).toBe(monday);
  });

  it('throws on a malformed date instead of guessing', () => {
    expect(() => weekStartDate('20-10-2026')).toThrow('Invalid ISO date');
  });
});
