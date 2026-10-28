/**
 * Turning an instant from the server into a date or a time (K2). The case that matters is the one
 * that is silent when it is wrong: an instant late in the UTC evening is already the next day in
 * Jakarta, and reading it in UTC — or in whatever zone the phone happens to be in — moves an event
 * to the wrong day and its time by hours.
 */
import {
  byNewestInstant,
  instantDate,
  instantIsOn,
  instantParts,
  instantTime,
  resetInstantFormatters,
} from '@/data/instant';

import { seedClock, TEST_CLOCK } from '../helpers/clock-fixtures';
import { resetSessionForTest, seedSession } from '../helpers/session-fixtures';

const WIB = 'Asia/Jakarta';

beforeEach(() => {
  resetInstantFormatters();
  resetSessionForTest();
  seedSession();
  seedClock();
});

describe('across midnight in the team zone', () => {
  it('puts 23:30 UTC on the next day in Jakarta', () => {
    // 2026-10-26T23:30:00Z is 06:30 on the 27th at UTC+7.
    expect(instantDate('2026-10-26T23:30:00Z', WIB)).toBe('2026-10-27');
    expect(instantTime('2026-10-26T23:30:00Z', WIB)).toBe('06:30');
  });

  it('reading the same instant in UTC gives the wrong day — the bug this prevents', () => {
    expect(instantDate('2026-10-26T23:30:00Z', 'UTC')).toBe('2026-10-26');
    expect(instantDate('2026-10-26T23:30:00Z', WIB)).not.toBe(
      instantDate('2026-10-26T23:30:00Z', 'UTC'),
    );
  });

  it('keeps 17:00 UTC on the same day, so the shift is not applied blindly', () => {
    expect(instantDate('2026-10-26T17:00:00Z', WIB)).toBe('2026-10-27');
    expect(instantDate('2026-10-26T16:59:59Z', WIB)).toBe('2026-10-26');
    expect(instantTime('2026-10-26T16:59:59Z', WIB)).toBe('23:59');
  });

  it('crosses the year the same way', () => {
    expect(instantDate('2026-12-31T23:00:00Z', WIB)).toBe('2027-01-01');
    expect(instantTime('2026-12-31T23:00:00Z', WIB)).toBe('06:00');
  });

  it('keeps midnight at 00, not 24', () => {
    expect(instantTime('2026-10-26T17:00:00Z', WIB)).toBe('00:00');
  });
});

describe('the zone it uses', () => {
  it("defaults to the server's, so a call site cannot forget it", () => {
    expect(instantDate('2026-10-26T23:30:00Z')).toBe('2026-10-27');
    expect(TEST_CLOCK.timeZone).toBe(WIB);
  });

  it('is never the device zone: the same instant reads the same whatever the phone is set to', () => {
    const inJakarta = instantParts('2026-10-26T23:30:00Z');
    // An offset the device could plausibly be in; the helper ignores it either way.
    expect(instantParts('2026-10-26T23:30:00Z', 'America/New_York').date).toBe('2026-10-26');
    expect(inJakarta.date).toBe('2026-10-27');
    expect(inJakarta.hour).toBe(6);
  });

  it('throws when the clock has not loaded rather than using the device zone', () => {
    resetSessionForTest();

    expect(() => instantDate('2026-10-26T23:30:00Z')).toThrow(/GET \/api\/app\/home/);
  });
});

describe('the pieces', () => {
  it('reports the parts a screen shows', () => {
    expect(instantParts('2026-10-26T23:30:00Z', WIB)).toEqual({
      date: '2026-10-27',
      time: '06:30',
      year: 2026,
      month: 10,
      day: 27,
      hour: 6,
      minute: 30,
    });
  });

  it('answers whether an instant falls on a given day in that zone', () => {
    expect(instantIsOn('2026-10-26T23:30:00Z', '2026-10-27', WIB)).toBe(true);
    expect(instantIsOn('2026-10-26T23:30:00Z', '2026-10-26', WIB)).toBe(false);
  });

  it('orders instants newest first, with no zone involved', () => {
    const list = ['2026-10-26T01:00:00Z', '2026-10-27T01:00:00Z', '2026-10-25T01:00:00Z'];

    expect([...list].sort(byNewestInstant)).toEqual([
      '2026-10-27T01:00:00Z',
      '2026-10-26T01:00:00Z',
      '2026-10-25T01:00:00Z',
    ]);
  });

  it('accepts an instant with an offset, not only Z', () => {
    expect(instantDate('2026-10-27T06:30:00+07:00', WIB)).toBe('2026-10-27');
    expect(instantTime('2026-10-27T06:30:00+07:00', WIB)).toBe('06:30');
  });

  it('refuses anything that is not a datetime, instead of reporting a date from NaN', () => {
    expect(() => instantDate('not a date', WIB)).toThrow('Not an ISO datetime: not a date');
    expect(() => instantDate('', WIB)).toThrow(/Not an ISO datetime/);
  });
});
