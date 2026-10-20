/** Leave input rules: real calendar days, no past start, end not before start, bounded range, bounded text. */
import { describe, expect, test } from 'bun:test';
import {
  LEAVE_MAX_DAYS,
  LEAVE_NOTE_MAX,
  LEAVE_REJECT_REASON_MAX,
} from '../../server/leave/leave.dto';
import {
  cleanLeaveInput,
  cleanRejectReason,
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
    expect(cleanLeaveInput({ startDate: TODAY, endDate: '2026-10-09' }, TODAY)).toEqual({
      startDate: TODAY,
      endDate: '2026-10-09',
      note: null,
      days: 3,
    });
    expect(leaveDays(TODAY, TODAY)).toBe(1);
  });

  test('a start before today is refused with the actionable sentence', () => {
    const r = refused(cleanLeaveInput({ startDate: '2026-10-06', endDate: '2026-10-08' }, TODAY));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.pastStart });
  });

  test('an end before the start is refused', () => {
    const r = refused(cleanLeaveInput({ startDate: '2026-10-10', endDate: '2026-10-09' }, TODAY));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.endBeforeStart });
  });

  test('a date that is not on the calendar is refused before any comparison', () => {
    const r = refused(cleanLeaveInput({ startDate: '2026-02-30', endDate: '2026-03-02' }, TODAY));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.badDate });
  });

  test('the longest range is accepted and one day more is refused', () => {
    const last = new Date(Date.UTC(2026, 9, 7 + LEAVE_MAX_DAYS - 1)).toISOString().slice(0, 10);
    const over = new Date(Date.UTC(2026, 9, 7 + LEAVE_MAX_DAYS)).toISOString().slice(0, 10);
    expect(isLeaveRefusal(cleanLeaveInput({ startDate: TODAY, endDate: last }, TODAY))).toBe(false);
    expect(refused(cleanLeaveInput({ startDate: TODAY, endDate: over }, TODAY))).toMatchObject({
      code: 'VALIDATION',
      error: LEAVE_MESSAGES.tooLong,
    });
  });

  test('the note is trimmed, blank becomes null, and an over-long one is refused', () => {
    const ok = cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: '  ke dokter  ' }, TODAY);
    expect(isLeaveRefusal(ok)).toBe(false);
    expect(ok).toMatchObject({ note: 'ke dokter' });
    expect(cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: '   ' }, TODAY)).toMatchObject(
      {
        note: null,
      },
    );
    const long = 'x'.repeat(LEAVE_NOTE_MAX + 1);
    const r = refused(cleanLeaveInput({ startDate: TODAY, endDate: TODAY, note: long }, TODAY));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.noteTooLong });
  });
});

describe('cleanRejectReason', () => {
  test('a reason is optional: blank and missing both mean none', () => {
    expect(cleanRejectReason(undefined)).toBeNull();
    expect(cleanRejectReason('  ')).toBeNull();
    expect(cleanRejectReason(' tim sedang padat ')).toBe('tim sedang padat');
  });

  test('an over-long reason is refused', () => {
    const r = refused(cleanRejectReason('x'.repeat(LEAVE_REJECT_REASON_MAX + 1)));
    expect(r).toMatchObject({ code: 'VALIDATION', error: LEAVE_MESSAGES.reasonTooLong });
  });
});
