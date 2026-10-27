/**
 * Leave input rules: real calendar days, end not before start, bounded range, bounded text. There is
 * deliberately no "not in the past" rule — recording a leave that already started is the commonest
 * case (P14 §10 T3) — so a past range is asserted to pass.
 */
import { describe, expect, test } from 'bun:test';
import { LEAVE_MAX_DAYS, LEAVE_NOTE_MAX } from '../../server/leave/leave.dto';
import {
  cleanLeaveInput,
  isCalendarDate,
  isLeaveRefusal,
  LEAVE_MESSAGES,
  leaveDays,
} from '../../server/leave/leave.validate';

const TODAY = '2026-10-07';
const refused = (v: unknown) => (isLeaveRefusal(v) ? v : null);

describe('isCalendarDate', () => {
  test.each(['2026-10-07', '2028-02-29', '2026-12-31'])('accepts %s', (d) => {
    expect(isCalendarDate(d)).toBe(true);
  });

  test.each(['2026-02-30', '2026-13-01', '2027-02-29', '07-10-2026', '2026-1-7', '', 'besok'])(
    'rejects %p',
    (d) => {
      expect(isCalendarDate(d)).toBe(false);
    },
  );
});

describe('cleanLeaveInput', () => {
  test('starting today is allowed (cuti mendadak) and counts both ends', () => {
    expect(cleanLeaveInput({ startDate: TODAY, endDate: '2026-10-09' })).toEqual({
      startDate: TODAY,
      endDate: '2026-10-09',
      note: null,
      days: 3,
    });
    expect(leaveDays(TODAY, TODAY)).toBe(1);
  });

  test('a range that is wholly in the past is accepted (P14 §10 T3)', () => {
    expect(cleanLeaveInput({ startDate: '2026-09-01', endDate: '2026-09-03' })).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      note: null,
      days: 3,
    });
  });

  test('an end before the start is refused', () => {
    const r = refused(cleanLeaveInput({ startDate: '2026-10-10', endDate: '2026-10-09' }));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.endBeforeStart });
  });

  test('a date that is not on the calendar is refused before any comparison', () => {
    const r = refused(cleanLeaveInput({ startDate: '2026-02-30', endDate: '2026-03-02' }));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.badDate });
  });

  test('the longest range is accepted and one day more is refused', () => {
    const last = new Date(Date.UTC(2026, 9, 7 + LEAVE_MAX_DAYS - 1)).toISOString().slice(0, 10);
    const over = new Date(Date.UTC(2026, 9, 7 + LEAVE_MAX_DAYS)).toISOString().slice(0, 10);
    expect(isLeaveRefusal(cleanLeaveInput({ startDate: TODAY, endDate: last }))).toBe(false);
    expect(refused(cleanLeaveInput({ startDate: TODAY, endDate: over }))).toMatchObject({
      code: 'VALIDATION',
      error: LEAVE_MESSAGES.tooLong,
    });
  });

  test('the note is trimmed, blank becomes null, and an over-long one is refused', () => {
    const ok = cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: '  ke dokter  ' });
    expect(isLeaveRefusal(ok)).toBe(false);
    expect(ok).toMatchObject({ note: 'ke dokter' });
    expect(cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: '   ' })).toMatchObject(
      {
        note: null,
      },
    );
    const long = 'x'.repeat(LEAVE_NOTE_MAX + 1);
    const r = refused(cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: long }));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.noteTooLong });
  });
});
