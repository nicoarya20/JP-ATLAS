/**
 * Pure wording shared by the Ketersediaan card and the Inbox cards. The form helpers and the
 * four-state card view left with the application flow (P14 CU-02/CU-05).
 */
import { describe, expect, it } from 'bun:test';
import {
  dueTasksLabel,
  formatLeaveDay,
  formatLeaveRange,
  leaveDaysLabel,
} from '../../app/lib/leave-view';

describe('formatLeaveRange', () => {
  it('writes a range inside one month with the month and year once', () => {
    expect(formatLeaveRange('2026-10-14', '2026-10-16')).toBe('14–16 Okt 2026');
  });

  it('writes both months when the range crosses a month, and both years across New Year', () => {
    expect(formatLeaveRange('2026-10-30', '2026-11-02')).toBe('30 Okt–2 Nov 2026');
    expect(formatLeaveRange('2026-12-30', '2027-01-02')).toBe('30 Des 2026–2 Jan 2027');
  });

  it('writes a single day once', () => {
    expect(formatLeaveRange('2026-10-14', '2026-10-14')).toBe('14 Okt 2026');
    expect(formatLeaveDay('2026-08-05')).toBe('5 Agu 2026');
  });
});

describe('labels', () => {
  it('counts days and due tasks, with a sentence for none', () => {
    expect(leaveDaysLabel(3)).toBe('3 hari');
    expect(dueTasksLabel(2)).toBe('2 tugas jatuh tempo selama cuti');
    expect(dueTasksLabel(0)).toBe('Tidak ada tugas jatuh tempo');
  });
});
