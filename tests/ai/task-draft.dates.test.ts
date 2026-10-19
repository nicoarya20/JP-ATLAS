/** Due-date tokens (A1): the code, not the model, turns "besok" or "Jumat" into a date. */
import { describe, expect, it } from 'bun:test';
import { addDays, resolveDue } from '../../server/ai/task-draft.dates';

/** Wednesday, the "today" of the Atlas scenario; fixed so no test depends on the machine clock. */
const WED = '2026-10-07';

describe('resolveDue', () => {
  it('offsets: hari ini, besok, lusa, minggu depan', () => {
    expect(resolveDue({ kind: 'offset', days: 0 }, WED)).toBe('2026-10-07');
    expect(resolveDue({ kind: 'offset', days: 1 }, WED)).toBe('2026-10-08');
    expect(resolveDue({ kind: 'offset', days: 2 }, WED)).toBe('2026-10-09');
    expect(resolveDue({ kind: 'offset', days: 7 }, WED)).toBe('2026-10-14');
  });

  it('crosses month and year ends and leap days', () => {
    expect(resolveDue({ kind: 'offset', days: 1 }, '2026-12-31')).toBe('2027-01-01');
    expect(resolveDue({ kind: 'offset', days: 1 }, '2028-02-28')).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it.each([-1, 1.5, 731, Number.NaN])('rejects the offset %p', (days) => {
    expect(resolveDue({ kind: 'offset', days }, WED)).toBeNull();
  });

  it('a weekday names the coming day, today included', () => {
    expect(resolveDue({ kind: 'weekday', weekday: 'fri', next: false }, WED)).toBe('2026-10-09');
    expect(resolveDue({ kind: 'weekday', weekday: 'wed', next: false }, WED)).toBe('2026-10-07');
    expect(resolveDue({ kind: 'weekday', weekday: 'mon', next: false }, WED)).toBe('2026-10-12');
    expect(resolveDue({ kind: 'weekday', weekday: 'sun', next: false }, WED)).toBe('2026-10-11');
  });

  it('"depan" is the same weekday of the next Monday-Sunday week', () => {
    expect(resolveDue({ kind: 'weekday', weekday: 'fri', next: true }, WED)).toBe('2026-10-16');
    expect(resolveDue({ kind: 'weekday', weekday: 'mon', next: true }, WED)).toBe('2026-10-12');
    // From a Sunday, "next week" starts tomorrow.
    expect(resolveDue({ kind: 'weekday', weekday: 'mon', next: true }, '2026-10-11')).toBe(
      '2026-10-12',
    );
    // From a Monday, Friday of next week is eleven days away.
    expect(resolveDue({ kind: 'weekday', weekday: 'fri', next: true }, '2026-10-12')).toBe(
      '2026-10-23',
    );
  });

  it('a day of the month is the next such day, this month or later', () => {
    expect(resolveDue({ kind: 'monthday', day: 15, month: null }, WED)).toBe('2026-10-15');
    expect(resolveDue({ kind: 'monthday', day: 3, month: null }, WED)).toBe('2026-11-03');
    expect(resolveDue({ kind: 'monthday', day: 7, month: null }, WED)).toBe('2026-10-07');
    expect(resolveDue({ kind: 'monthday', day: 31, month: null }, '2026-11-05')).toBe('2026-12-31');
  });

  it('a day and month roll to next year when already past', () => {
    expect(resolveDue({ kind: 'monthday', day: 15, month: 11 }, WED)).toBe('2026-11-15');
    expect(resolveDue({ kind: 'monthday', day: 5, month: 10 }, WED)).toBe('2027-10-05');
    expect(resolveDue({ kind: 'monthday', day: 29, month: 2 }, WED)).toBe('2028-02-29');
  });

  it.each([
    [0, null],
    [32, null],
    [30, 2],
    [10, 13],
  ])('rejects the impossible day %p month %p', (day, month) => {
    expect(resolveDue({ kind: 'monthday', day, month }, WED)).toBeNull();
  });

  it('an explicit date must be real and near enough', () => {
    expect(resolveDue({ kind: 'date', iso: '2026-11-20' }, WED)).toBe('2026-11-20');
    expect(resolveDue({ kind: 'date', iso: '2026-02-30' }, WED)).toBeNull();
    expect(resolveDue({ kind: 'date', iso: '2026-13-01' }, WED)).toBeNull();
    expect(resolveDue({ kind: 'date', iso: '20 Nov 2026' }, WED)).toBeNull();
    expect(resolveDue({ kind: 'date', iso: '1999-01-01' }, WED)).toBeNull();
    expect(resolveDue({ kind: 'date', iso: '2099-01-01' }, WED)).toBeNull();
  });
});
