/**
 * Error codes of the deadline and condition-override writes (S5a-03). They live here, not in
 * `pm/errors.ts`, so this slice adds no lines to the shared catalog other S5a slices also edit.
 * Pure and browser-safe; every message is Indonesian and says what to do next.
 */

export const DEADLINE_ERRORS = {
  NOT_LATER: 'Tenggat baru harus lebih lambat dari tenggat sekarang. Pilih tanggal setelahnya.',
  NO_DEADLINE: 'Proyek ini belum punya tenggat. Isi tenggatnya lewat ubah proyek dulu.',
  PROJECT_CLOSED:
    'Proyek yang sudah selesai atau dibatalkan tidak bisa diperpanjang. Ubah statusnya dulu.',
  NOT_ACTIVE: 'Kondisi manual hanya bisa dipasang pada proyek yang sedang berjalan.',
} as const;

export type DeadlineCode = keyof typeof DEADLINE_ERRORS;

/** Every code above answers 422: the request is well formed but the project's state refuses it. */
export const DEADLINE_HTTP = 422;

export function isDeadlineCode(code: string): code is DeadlineCode {
  return code in DEADLINE_ERRORS;
}
