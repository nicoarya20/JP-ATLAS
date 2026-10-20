/**
 * Pure view logic of the leave UI: date ranges, labels and the four states of the "Cuti" card.
 * No React and no clock: "today" always arrives from the server, so every rule is testable on any date.
 */
import { LEAVE_NOTE_MAX } from '@server/leave/leave.dto';
import {
  LEAVE_BADGES,
  LEAVE_COPY,
  LEAVE_FORM_COPY,
  LEAVE_PENDING_SENT,
  LEAVE_ROUTE_COPY,
  LEAVE_STATUS_LABEL,
} from '../components/leave/leave.copy';
import type { LeaveApprovers, LeaveInput, LeaveMeDto, LeaveRequestDto } from './leave-api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

type Day = { y: string; m: number; d: number };

function parse(iso: string): Day {
  const [y = '', m = '1', d = '1'] = iso.split('-');
  return { y, m: Number(m) - 1, d: Number(d) };
}

/** "16 Okt 2026" for a `YYYY-MM-DD` date. */
export function formatLeaveDay(iso: string): string {
  const { y, m, d } = parse(iso);
  return `${d} ${MONTHS[m] ?? ''} ${y}`;
}

/** "14–16 Okt 2026"; the month and year are written once while they are shared, never abbreviated away. */
export function formatLeaveRange(start: string, end: string): string {
  if (start === end) return formatLeaveDay(start);
  const a = parse(start);
  const b = parse(end);
  if (a.y !== b.y) return `${formatLeaveDay(start)}–${formatLeaveDay(end)}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m]}–${b.d} ${MONTHS[b.m]} ${b.y}`;
  return `${a.d}–${b.d} ${MONTHS[b.m]} ${b.y}`;
}

export const leaveDaysLabel = (days: number) => `${days} hari`;

/** "3 tugas jatuh tempo selama cuti", or the sentence for none. */
export function dueTasksLabel(count: number): string {
  return count > 0 ? `${count} tugas jatuh tempo selama cuti` : 'Tidak ada tugas jatuh tempo';
}

/** The send button: an Admin, or any request while the approval switch is off, saves leave outright. */
export const submitLabel = (autoApproves: boolean) =>
  autoApproves ? LEAVE_FORM_COPY.submitSave : LEAVE_FORM_COPY.submitRequest;

export const approversHint = (approvers: LeaveApprovers) => LEAVE_ROUTE_COPY[approvers];

export type LeaveFormValues = { from: string | null; to: string | null; note: string };

/** Why the form cannot be sent yet, in plain words, or null. The server still has the last word (overlap, 90 days). */
export function leaveFormBlocker(v: LeaveFormValues, today: string): string | null {
  if (!v.from) return LEAVE_FORM_COPY.needFrom;
  if (v.from < today) return LEAVE_FORM_COPY.startInPast;
  if (!v.to) return LEAVE_FORM_COPY.needTo;
  if (v.to < v.from) return LEAVE_FORM_COPY.endBeforeStart;
  if (v.note.length > LEAVE_NOTE_MAX) return LEAVE_FORM_COPY.noteTooLong(LEAVE_NOTE_MAX);
  return null;
}

/** The request body for a form that passed `leaveFormBlocker`, or null when it did not. */
export function toLeaveInput(v: LeaveFormValues, today: string): LeaveInput | null {
  if (leaveFormBlocker(v, today) !== null || !v.from || !v.to) return null;
  return { startDate: v.from, endDate: v.to, note: v.note.trim() === '' ? null : v.note.trim() };
}

export type LeaveCardView = {
  title: string;
  badge: { label: string; color: 'warn' | 'ok' | 'danger' } | null;
  detail: string;
  /** `request` opens the form; `cancel` asks for confirmation. Null when nothing can be done. */
  action: { kind: 'request' | 'cancel'; label: string } | null;
};

const rangeOf = (r: LeaveRequestDto) => formatLeaveRange(r.startDate, r.endDate);

function approvedDetail(r: LeaveRequestDto, today: string): string {
  const by = r.decidedBy ? `Disetujui oleh ${r.decidedBy.name}.` : LEAVE_COPY.immediately;
  const seen =
    r.startDate > today
      ? `Rekan akan melihat Anda sebagai Cuti pada ${rangeOf(r)}.`
      : `Rekan melihat Anda sebagai Cuti sampai ${formatLeaveDay(r.endDate)}.`;
  return `${by} ${seen}`;
}

/** The "Cuti" card for one `GET /leave/me` answer: title, badge, sentence under it and the one button. */
export function leaveCardView(
  me: LeaveMeDto,
  approvers: LeaveApprovers,
  today: string,
): LeaveCardView {
  const r = me.request;
  if (me.state === 'none' || !r) {
    return {
      title: LEAVE_COPY.cardTitle,
      badge: null,
      detail: LEAVE_COPY.noneText,
      action: { kind: 'request', label: LEAVE_COPY.request },
    };
  }
  if (me.state === 'rejected') {
    const name = r.decidedBy?.name ?? LEAVE_COPY.decidedByUnknown;
    return {
      title: `Pengajuan ${rangeOf(r)}`,
      badge: { label: LEAVE_BADGES.rejected, color: 'danger' },
      detail: `Alasan ${name}: ${r.rejectReason?.trim() || LEAVE_COPY.noReason}`,
      action: { kind: 'request', label: LEAVE_COPY.requestAgain },
    };
  }
  const cancel = r.canCancel ? { kind: 'cancel' as const } : null;
  if (me.state === 'pending') {
    return {
      title: `Cuti ${rangeOf(r)}`,
      badge: { label: LEAVE_BADGES.pending, color: 'warn' },
      detail: `${LEAVE_PENDING_SENT[approvers]} ${LEAVE_COPY.awaitingNews}`,
      action: cancel && { ...cancel, label: LEAVE_COPY.cancelRequest },
    };
  }
  return {
    title: `Cuti ${rangeOf(r)}`,
    badge: { label: LEAVE_BADGES.approved, color: 'ok' },
    detail: approvedDetail(r, today),
    action: cancel && { ...cancel, label: LEAVE_COPY.cancelLeave },
  };
}

/** One line of the history under the card: "14–16 Okt 2026 · Ditolak". */
export const historyLine = (r: LeaveRequestDto) =>
  `${rangeOf(r)} · ${LEAVE_STATUS_LABEL[r.status]}`;
