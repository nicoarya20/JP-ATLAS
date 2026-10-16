/** Trash retention (S1-05): calendar days in the team zone, expiry on day 31 with the default 30. */
import { describe, expect, it } from 'bun:test';
import { METRICS } from '../../server/metrics/config';
import { isRestorable, trashDaysLeft } from '../../server/metrics/trash.metrics';

// test-only instants; WIB = UTC+7 (METRICS.TIME_ZONE = Asia/Jakarta).
const DELETED = new Date('2026-10-07T16:59:00Z'); // 7 Oct 23:59 WIB = day 1

describe('trashDaysLeft / isRestorable', () => {
  it('uses the zone from the config', () => {
    expect(METRICS.TIME_ZONE).toBe('Asia/Jakarta');
    expect(METRICS.TRASH_RETENTION_DAYS).toBe(30);
  });

  it.each([
    ['deletion minute', '2026-10-07T16:59:00Z', 30, true],
    ['one minute later, already 8 Oct WIB (day 2)', '2026-10-07T17:00:00Z', 29, true],
    ['day 30, last second (5 Nov 23:59:59 WIB)', '2026-11-05T16:59:59Z', 1, true],
    ['day 31, first second (6 Nov 00:00 WIB)', '2026-11-05T17:00:00Z', 0, false],
    ['long after', '2027-03-01T00:00:00Z', 0, false],
  ] as const)('%s', (_label, now, left, ok) => {
    expect(trashDaysLeft(DELETED, new Date(now))).toBe(left);
    expect(isRestorable(DELETED, new Date(now))).toBe(ok);
  });

  it('counts WIB days, not UTC days', () => {
    const lateUtc = new Date('2026-10-07T17:30:00Z'); // still 7 Oct in UTC, but 8 Oct 00:30 WIB
    const now = new Date('2026-11-06T10:00:00Z'); // 6 Nov 17:00 WIB: 29 days after 8 Oct
    expect(trashDaysLeft(lateUtc, now)).toBe(1);
    expect(isRestorable(lateUtc, now)).toBe(true);
  });

  it('follows a shorter configured retention', () => {
    const cfg = { ...METRICS, TRASH_RETENTION_DAYS: 7 };
    expect(isRestorable(DELETED, new Date('2026-10-13T12:00:00Z'), cfg)).toBe(true); // day 7
    expect(isRestorable(DELETED, new Date('2026-10-14T12:00:00Z'), cfg)).toBe(false); // day 8
  });
});
