/** Team-zone date + clock time to an ISO instant (S7 E-10): day edges, odd zones, impossible input. */
import { describe, expect, it } from 'bun:test';
import { addMinutes, timeToMinutes, zonedInstant } from '../../app/lib/events-time';

const WIB = 'Asia/Jakarta'; // test-only

describe('zonedInstant', () => {
  it('reads the clock in the team zone: 09.00 WIB is 02:00Z', () => {
    expect(zonedInstant('2026-10-21', '09:00', WIB)).toBe('2026-10-21T02:00:00.000Z');
  });

  it('crosses to the previous UTC day before 07.00 WIB', () => {
    expect(zonedInstant('2026-10-21', '00:30', WIB)).toBe('2026-10-20T17:30:00.000Z');
    expect(zonedInstant('2026-10-21', '06:59', WIB)).toBe('2026-10-20T23:59:00.000Z');
    expect(zonedInstant('2026-10-21', '07:00', WIB)).toBe('2026-10-21T00:00:00.000Z');
  });

  it('keeps the last minute of the day on that day', () => {
    expect(zonedInstant('2026-10-31', '23:59', WIB)).toBe('2026-10-31T16:59:00.000Z');
  });

  it('crosses month and year edges', () => {
    expect(zonedInstant('2026-12-31', '23:30', WIB)).toBe('2026-12-31T16:30:00.000Z');
    expect(zonedInstant('2027-01-01', '03:00', WIB)).toBe('2026-12-31T20:00:00.000Z');
  });

  it('follows the zone it is given, not the machine', () => {
    expect(zonedInstant('2026-10-21', '09:00', 'Asia/Makassar')).toBe('2026-10-21T01:00:00.000Z'); // test-only
    expect(zonedInstant('2026-10-21', '09:00', 'Asia/Jayapura')).toBe('2026-10-21T00:00:00.000Z'); // test-only
    expect(zonedInstant('2026-10-21', '09:00', 'UTC')).toBe('2026-10-21T09:00:00.000Z'); // test-only
  });

  it('uses the offset of that date in a zone with daylight saving', () => {
    // New York is UTC-4 in summer and UTC-5 in winter.
    expect(zonedInstant('2026-07-01', '09:00', 'America/New_York')).toBe(
      '2026-07-01T13:00:00.000Z',
    ); // test-only
    expect(zonedInstant('2026-12-01', '09:00', 'America/New_York')).toBe(
      '2026-12-01T14:00:00.000Z',
    ); // test-only
  });

  it('answers null for a date or time that does not exist', () => {
    expect(zonedInstant('2026-02-30', '09:00', WIB)).toBeNull();
    expect(zonedInstant('2026-13-01', '09:00', WIB)).toBeNull();
    expect(zonedInstant('21-10-2026', '09:00', WIB)).toBeNull();
    expect(zonedInstant('2026-10-21', '24:00', WIB)).toBeNull();
    expect(zonedInstant('2026-10-21', '9:00', WIB)).toBeNull();
    expect(zonedInstant('2026-10-21', '', WIB)).toBeNull();
  });
});

describe('timeToMinutes and addMinutes', () => {
  it('reads HH:mm only', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('09:60')).toBeNull();
  });

  it('adds minutes within the day and refuses to pass midnight', () => {
    expect(addMinutes('09:00', 60)).toBe('10:00');
    expect(addMinutes('09:30', 45)).toBe('10:15');
    expect(addMinutes('22:59', 61)).toBeNull();
    expect(addMinutes('23:00', 60)).toBeNull();
    expect(addMinutes('23:00', 59)).toBe('23:59');
    expect(addMinutes('', 60)).toBeNull();
  });
});
