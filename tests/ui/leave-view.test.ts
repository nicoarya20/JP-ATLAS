/** Pure leave view logic: date ranges, labels, the send button per person and the four states of the card. */
import { describe, expect, it } from 'bun:test';
import { LEAVE_COPY, LEAVE_FORM_COPY } from '../../app/components/leave/leave.copy';
import type { LeaveMeDto, LeaveRequestDto } from '../../app/lib/leave-api';
import {
  approversHint,
  dueTasksLabel,
  formatLeaveDay,
  formatLeaveRange,
  historyLine,
  leaveCardView,
  leaveDaysLabel,
  leaveFormBlocker,
  submitLabel,
  toLeaveInput,
} from '../../app/lib/leave-view';
import { LEAVE_NOTE_MAX } from '../../server/leave/leave.dto';

const TODAY = '2026-10-10'; // test-only

const req = (over: Partial<LeaveRequestDto> = {}): LeaveRequestDto => ({
  id: 'l-1',
  userId: 'u-1',
  startDate: '2026-10-14',
  endDate: '2026-10-16',
  days: 3,
  note: null,
  status: 'pending',
  decidedBy: null,
  decidedAt: null,
  rejectReason: null,
  createdAt: '2026-10-09T03:00:00.000Z',
  canCancel: true,
  ...over,
});

const me = (state: LeaveMeDto['state'], request: LeaveRequestDto | null): LeaveMeDto => ({
  state,
  request,
  history: request ? [request] : [],
  requiresApproval: true,
});

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

  it('labels the send button by whether the leave is approved on the spot', () => {
    expect(submitLabel(false)).toBe('Kirim pengajuan');
    expect(submitLabel(true)).toBe('Simpan cuti');
  });

  it('tells each kind of applicant where the request goes', () => {
    expect(approversHint('admin')).toBe('Pengajuan dikirim ke Admin.');
    expect(approversHint('manager_or_admin')).toBe(
      'Pengajuan dikirim ke Pengelola proyek Anda atau Admin.',
    );
    expect(approversHint('none')).toContain('langsung berlaku');
  });
});

describe('leaveFormBlocker and toLeaveInput', () => {
  const ok = { from: '2026-10-14', to: '2026-10-16', note: '' };

  it('asks for the dates in order, then refuses a reversed range and a past start', () => {
    expect(leaveFormBlocker({ from: null, to: null, note: '' }, TODAY)).toBe(
      LEAVE_FORM_COPY.needFrom,
    );
    expect(leaveFormBlocker({ ...ok, from: '2026-10-09' }, TODAY)).toBe(
      LEAVE_FORM_COPY.startInPast,
    );
    expect(leaveFormBlocker({ ...ok, to: null }, TODAY)).toBe(LEAVE_FORM_COPY.needTo);
    expect(leaveFormBlocker({ ...ok, to: '2026-10-13' }, TODAY)).toBe(
      LEAVE_FORM_COPY.endBeforeStart,
    );
  });

  it('accepts today as the first day and a one-day range', () => {
    expect(leaveFormBlocker({ from: TODAY, to: TODAY, note: '' }, TODAY)).toBeNull();
  });

  it('refuses a note over the server limit', () => {
    const long = 'a'.repeat(LEAVE_NOTE_MAX + 1);
    expect(leaveFormBlocker({ ...ok, note: long }, TODAY)).toBe(
      LEAVE_FORM_COPY.noteTooLong(LEAVE_NOTE_MAX),
    );
  });

  it('builds the request body with a trimmed note, or null for a blank one', () => {
    expect(toLeaveInput({ ...ok, note: '  Cuti keluarga ' }, TODAY)).toEqual({
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      note: 'Cuti keluarga',
    });
    expect(toLeaveInput({ ...ok, note: '   ' }, TODAY)?.note).toBeNull();
    expect(toLeaveInput({ ...ok, to: null }, TODAY)).toBeNull();
  });
});

describe('leaveCardView', () => {
  it('none: says the person is available and offers to ask', () => {
    const v = leaveCardView(me('none', null), 'manager_or_admin', TODAY);
    expect(v.badge).toBeNull();
    expect(v.detail).toBe('Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.');
    expect(v.action).toEqual({ kind: 'request', label: 'Ajukan cuti' });
  });

  it('pending: shows the range, the badge, who it went to and the way to withdraw', () => {
    const v = leaveCardView(me('pending', req()), 'manager_or_admin', TODAY);
    expect(v.title).toBe('Cuti 14–16 Okt 2026');
    expect(v.badge).toEqual({ label: 'Menunggu persetujuan', color: 'warn' });
    expect(v.detail).toContain('Pengelola proyek Anda atau Admin');
    expect(v.detail).toContain('Anda akan diberi kabar');
    expect(v.action).toEqual({ kind: 'cancel', label: 'Batalkan pengajuan' });
    expect(leaveCardView(me('pending', req()), 'admin', TODAY).detail).toContain(
      'Dikirim ke Admin.',
    );
  });

  it('approved by someone: names them and says until when colleagues see Cuti', () => {
    const request = req({ status: 'approved', decidedBy: { id: 'a', name: 'Ayu' } });
    const v = leaveCardView(me('approved', request), 'admin', '2026-10-15');
    expect(v.badge).toEqual({ label: 'Disetujui', color: 'ok' });
    expect(v.detail).toBe(
      'Disetujui oleh Ayu. Rekan melihat Anda sebagai Cuti sampai 16 Okt 2026.',
    );
    expect(v.action).toEqual({ kind: 'cancel', label: 'Batalkan cuti' });
  });

  it('approved on the spot: no approver name, "Cuti langsung berlaku"', () => {
    const v = leaveCardView(me('approved', req({ status: 'approved' })), 'none', '2026-10-15');
    expect(v.detail).toContain(LEAVE_COPY.immediately);
    expect(v.detail).not.toContain('Disetujui oleh');
  });

  it('approved for later: does not claim colleagues already see Cuti', () => {
    const v = leaveCardView(me('approved', req({ status: 'approved' })), 'none', TODAY);
    expect(v.detail).toContain('Rekan akan melihat Anda sebagai Cuti pada 14–16 Okt 2026');
  });

  it('approved but no longer withdrawable: no button', () => {
    const v = leaveCardView(
      me('approved', req({ status: 'approved', canCancel: false })),
      'none',
      TODAY,
    );
    expect(v.action).toBeNull();
  });

  it('rejected: shows the reason with the decider and offers to ask again', () => {
    const request = req({
      status: 'rejected',
      decidedBy: { id: 'a', name: 'Ayu' },
      rejectReason: 'Ada tenggat tanggal 16 Okt',
      canCancel: false,
    });
    const v = leaveCardView(me('rejected', request), 'manager_or_admin', TODAY);
    expect(v.title).toBe('Pengajuan 14–16 Okt 2026');
    expect(v.badge).toEqual({ label: 'Ditolak', color: 'danger' });
    expect(v.detail).toBe('Alasan Ayu: Ada tenggat tanggal 16 Okt');
    expect(v.action).toEqual({ kind: 'request', label: 'Ajukan lagi' });
  });

  it('rejected without a reason: says so instead of leaving a blank', () => {
    const request = req({
      status: 'rejected',
      decidedBy: { id: 'a', name: 'Ayu' },
      rejectReason: '  ',
    });
    expect(leaveCardView(me('rejected', request), 'admin', TODAY).detail).toBe(
      'Alasan Ayu: Tanpa alasan tertulis',
    );
  });
});

describe('historyLine', () => {
  it('writes the range and the status of a past request', () => {
    expect(historyLine(req({ status: 'canceled' }))).toBe('14–16 Okt 2026 · Dibatalkan');
    expect(historyLine(req({ status: 'rejected' }))).toBe('14–16 Okt 2026 · Ditolak');
  });
});
