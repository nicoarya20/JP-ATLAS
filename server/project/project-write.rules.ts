/**
 * Validation rules and result shape shared by the project write side: the user-facing messages,
 * the calendar-date checks and how a refused access decision becomes a result. Split out of
 * `project.service.ts` to keep that file within the service size limit.
 */
import type { LeadDecision } from '../access/members.policy';
import { CALENDAR_YEAR_MAX, CALENDAR_YEAR_MIN, isInCalendarRange } from '../metrics/dates';
import type { PmCode } from '../pm/errors';

/** A write outcome; `error` refines the catalog message of `code` when the cause is specific. */
export type WriteResult<T> = { ok: true; value: T } | { ok: false; code: PmCode; error?: string };

// User-facing Indonesian; each one says what to do next.
export const PROJECT_WRITE_MESSAGES = {
  NAME_REQUIRED: 'Nama proyek wajib diisi. Tulis nama proyeknya, lalu simpan lagi.',
  INITIAL_STATUS: 'Proyek baru hanya bisa berstatus Draf atau Berjalan. Pilih salah satunya.',
  REVIEW_UNAVAILABLE:
    'Pemeriksaan tugas belum tersedia. Matikan pilihan "Tugas baru perlu diperiksa", lalu simpan lagi.',
  BAD_DATE: 'Tanggal tidak valid. Pilih tanggal dari kalender, lalu simpan lagi.',
  DATE_OUT_OF_RANGE: `Tahun tanggal harus antara ${CALENDAR_YEAR_MIN} dan ${CALENDAR_YEAR_MAX}. Periksa tahunnya, lalu simpan lagi.`,
  DUE_BEFORE_START: 'Tenggat tidak boleh sebelum tanggal mulai. Ubah salah satu tanggalnya.',
  BAD_CANDIDATE:
    'Ada orang yang belum disetujui, sedang diblokir, atau tidak ditemukan. Hapus dari daftar, lalu simpan lagi.',
} as const;

/** A VALIDATION result carrying the user-facing `error`. */
export const invalid = (error: string): WriteResult<never> => ({
  ok: false,
  code: 'VALIDATION',
  error,
});

/** Refused decision to result; a hidden project answers NOT_FOUND so it looks missing (D8). */
export function refused(d: Exclude<LeadDecision, { ok: true }>): WriteResult<never> {
  return { ok: false, code: d.code === 'NOT_VISIBLE' ? 'NOT_FOUND' : d.code };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date such as `2026-02-28`; `2026-02-30` is false. */
export function isCalendarDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * The date problem of a start/due pair, or null; ISO strings compare correctly as text. The year
 * range is checked here and not in the route schema, so a mistyped year answers in Indonesian
 * instead of a shape error (PD-01).
 */
export function dateProblem(start: string | null | undefined, due: string | null | undefined) {
  for (const d of [start, due]) {
    if (!d) continue;
    if (!isCalendarDate(d)) return PROJECT_WRITE_MESSAGES.BAD_DATE;
    if (!isInCalendarRange(d)) return PROJECT_WRITE_MESSAGES.DATE_OUT_OF_RANGE;
  }
  return start && due && due < start ? PROJECT_WRITE_MESSAGES.DUE_BEFORE_START : null;
}
