import { describe, expect, it } from 'bun:test';
import { METRICS } from '../../server/metrics/config';
import { diffDays, isoDateIn } from '../../server/metrics/dates';

describe('isoDateIn', () => {
  it('R03 F16: 17:30 UTC on 6 Oct is already 7 Oct in Jakarta', () => {
    const now = new Date('2026-10-06T17:30:00Z');
    expect(isoDateIn(now, METRICS.TIME_ZONE)).toBe('2026-10-07');
    expect(isoDateIn(now, 'UTC')).toBe('2026-10-06');
  });

  it('flips exactly at local midnight', () => {
    expect(isoDateIn(new Date('2026-10-06T16:59:59Z'), 'Asia/Jakarta')).toBe('2026-10-06');
    expect(isoDateIn(new Date('2026-10-06T17:00:00Z'), 'Asia/Jakarta')).toBe('2026-10-07');
  });

  it('handles zones behind UTC and DST without shifting the date', () => {
    expect(isoDateIn(new Date('2026-01-01T03:00:00Z'), 'America/New_York')).toBe('2025-12-31');
    expect(isoDateIn(new Date('2026-07-01T03:59:00Z'), 'America/New_York')).toBe('2026-06-30');
  });

  it('zero-pads month and day', () => {
    expect(isoDateIn(new Date('2026-03-05T05:00:00Z'), 'Asia/Jakarta')).toBe('2026-03-05');
  });

  it('throws on an unknown zone instead of guessing', () => {
    expect(() => isoDateIn(new Date(0), 'Mars/Base')).toThrow();
  });
});

describe('diffDays', () => {
  it('counts across a month boundary', () => {
    expect(diffDays('2026-09-28', '2026-10-03')).toBe(5);
  });

  it('counts across a year boundary and a leap day', () => {
    expect(diffDays('2025-12-30', '2026-01-02')).toBe(3);
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2);
    expect(diffDays('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('is zero for the same day and negative when going back', () => {
    expect(diffDays('2026-10-07', '2026-10-07')).toBe(0);
    expect(diffDays('2026-10-07', '2026-10-01')).toBe(-6);
  });

  it('is not affected by DST transitions', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
  });

  it.each(['2026-1-1', '2026/10/01', '', '2026-10-01T00:00:00Z'])(
    'rejects malformed date %p with a clear error',
    (bad) => {
      expect(() => diffDays(bad, '2026-10-01')).toThrow(/Invalid ISO date/);
    },
  );
});
