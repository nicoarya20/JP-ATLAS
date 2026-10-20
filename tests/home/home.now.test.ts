/** Greeting, date and clock of the Beranda come from the team zone, whatever zone the server runs in. */
import { describe, expect, it } from 'bun:test';
import { greetingFor } from '../../server/home/home.copy';
import { clockLabel, homeNow, weekdayOf } from '../../server/home/home.now';

const JAKARTA = 'Asia/Jakarta'; // test-only

describe('greetingFor', () => {
  it.each([
    [0, 'malam'],
    [3, 'malam'],
    [4, 'pagi'],
    [10, 'pagi'],
    [11, 'siang'],
    [14, 'siang'],
    [15, 'sore'],
    [17, 'sore'],
    [18, 'malam'],
    [23, 'malam'],
  ])('at %i o clock it is "%s"', (hour, word) => {
    expect(greetingFor(hour)).toBe(word as ReturnType<typeof greetingFor>);
  });
});

describe('homeNow', () => {
  it('reads the greeting, date and day from the team zone (07.30 WIB is 00.30 UTC)', () => {
    const now = homeNow(new Date('2026-10-08T00:30:00Z'), JAKARTA);
    expect(now.greeting).toBe('pagi');
    expect(now.today).toBe('2026-10-08');
    expect(now.dateLabel).toBe('Kamis, 8 Oktober 2026');
    expect(now.timeLabel).toBe('07.30');
  });

  it('lets a UTC evening already be tomorrow in Jakarta', () => {
    const now = homeNow(new Date('2026-10-08T20:05:00Z'), JAKARTA);
    expect(now.today).toBe('2026-10-09');
    expect(now.greeting).toBe('malam');
    expect(now.timeLabel).toBe('03.05');
  });

  it('follows the zone it is given, not the machine', () => {
    const at = new Date('2026-10-08T00:30:00Z');
    expect(homeNow(at, 'UTC').timeLabel).toBe('00.30'); // test-only
    expect(homeNow(at, 'America/New_York').today).toBe('2026-10-07'); // test-only
  });

  it('reads the zone of the app when none is given', () => {
    expect(homeNow(new Date('2026-10-08T00:30:00Z')).iso).toBe('2026-10-08T00:30:00.000Z');
  });
});

describe('clockLabel and weekdayOf', () => {
  it('writes midnight as 00.00, never 24.00', () => {
    expect(clockLabel(new Date('2026-10-07T17:00:00Z'), JAKARTA)).toBe('00.00');
  });

  it('names the weekday of a calendar date', () => {
    expect(weekdayOf('2026-10-20')).toBe('Selasa');
    expect(weekdayOf('2026-10-25')).toBe('Minggu');
  });
});
