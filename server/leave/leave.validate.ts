/**
 * Turns the client's leave input into a clean range or a refusal. Pure and clock-free, so every
 * rule (a real calendar date, end not before start, a bounded range) is testable on any date.
 * Every refusal is user input, not an exception, and the route maps it to 422 `VALIDATION`.
 *
 * There is no "not in the past" rule: recording leave is not requesting it, and the commonest case
 * is a leave that already started and is only now being written down (P14 §10 T3). The 90-day cap
 * per period stays.
 */
import { diffDays } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import { LEAVE_MAX_DAYS, LEAVE_NOTE_MAX, type LeaveRefusal, refusal } from './leave.dto';

export type LeaveInput = { startDate: string; endDate: string; note?: string | null };
export type CleanLeave = {
  startDate: IsoDate;
  endDate: IsoDate;
  note: string | null;
  days: number;
};

/** User-facing refusals, in Indonesian and actionable. */
export const LEAVE_MESSAGES = {
  badDate: 'Tanggal belum sah. Pilih tanggal dari kalender.',
  endBeforeStart: 'Tanggal sampai tidak boleh sebelum tanggal mulai.',
  tooLong: `Cuti paling lama ${LEAVE_MAX_DAYS} hari sekali catat. Pecah menjadi beberapa periode.`,
  noteTooLong: `Catatan paling banyak ${LEAVE_NOTE_MAX} karakter. Persingkat catatanmu.`,
  /** The 409 names the period that clashes, so the Admin can fix it without hunting for it (P14 §10 T2). */
  overlap: (range: string) =>
    `Tanggal ini beririsan dengan cuti ${range} yang sudah tercatat. Pilih tanggal lain atau akhiri cuti itu dulu.`,
} as const;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `value` is a real calendar date written `YYYY-MM-DD` (rejects 2026-02-30, which Date would roll over). */
export function isCalendarDate(value: string): boolean {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/** Calendar days from `start` to `end`, both ends counted. */
export const leaveDays = (start: IsoDate, end: IsoDate): number => diffDays(start, end) + 1;

/** Trimmed text, or null when blank. */
const blankToNull = (v: string | null | undefined): string | null => {
  const text = v?.trim() ?? '';
  return text === '' ? null : text;
};

/** The range and note of a leave period, or the refusal to send back. */
export function cleanLeaveInput(input: LeaveInput): CleanLeave | LeaveRefusal {
  const { startDate, endDate } = input;
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
    return refusal('VALIDATION', LEAVE_MESSAGES.badDate);
  }
  if (endDate < startDate) return refusal('VALIDATION', LEAVE_MESSAGES.endBeforeStart);
  const days = leaveDays(startDate, endDate);
  if (days > LEAVE_MAX_DAYS) return refusal('VALIDATION', LEAVE_MESSAGES.tooLong);
  const note = blankToNull(input.note);
  if (note !== null && note.length > LEAVE_NOTE_MAX) {
    return refusal('VALIDATION', LEAVE_MESSAGES.noteTooLong);
  }
  return { startDate, endDate, note, days };
}

/** Narrowing helper: the cleaners return either a value or a refusal. */
export const isLeaveRefusal = (v: unknown): v is LeaveRefusal =>
  typeof v === 'object' && v !== null && (v as LeaveRefusal).ok === false;
