/**
 * Fixed limits and Indonesian messages of "Tulis saja ✦" (A1). Pure: no env reads, so the future UI
 * can import the text limit and the messages. Provider settings (key, model, timeout) are read
 * from the environment at call time in `ai.config.ts`.
 */

/** Longest story the endpoint accepts, counted after trimming. */
export const TASK_DRAFT_TEXT_MAX = 2000;

/** Most drafts one story may yield; a model answer with more is treated as broken, not cut. */
export const TASK_DRAFTS_MAX = 10;

/** Longest question, assignee note and display name that leave the server. */
export const TASK_DRAFT_QUESTION_MAX = 200;
export const TASK_DRAFT_NOTE_MAX = 200;
export const TASK_DRAFT_NAME_MAX = 80;

/** Most project members offered to the model and to the name matcher. */
export const TASK_DRAFT_MEMBERS_MAX = 200;

/** Per-user cap on provider calls: a call costs money, so this is lower than the write limiter. */
export const TASK_DRAFT_RATE_MAX = 10;
export const TASK_DRAFT_RATE_WINDOW_MS = 60_000;

/** A relative due date further than this many days ahead is not a plausible due date (null). */
export const TASK_DRAFT_OFFSET_MAX_DAYS = 730;
/** An explicit date more than this many days from today (either way) is dropped (null). */
export const TASK_DRAFT_DATE_WINDOW_DAYS = 3650;

/** Error codes of the endpoint, besides the shared PM codes (`NOT_FOUND`, `NOT_MEMBER`, ...). */
export const TASK_DRAFT_CODES = {
  disabled: 'AI_DISABLED',
  unavailable: 'AI_UNAVAILABLE',
  textEmpty: 'TEXT_EMPTY',
  textTooLong: 'TEXT_TOO_LONG',
} as const;

/** Messages the form shows as is; the fallback sentence tells the user what to do next. */
export const TASK_DRAFT_MESSAGES = {
  disabled: 'Tulis saja belum diaktifkan di aplikasi ini. Isi form saja.',
  unavailable: 'Tulis saja belum bisa dipakai sekarang. Isi form saja.',
  textEmpty: 'Tulis dulu ceritanya, baru bisa disusun.',
  textTooLong: `Tulisan paling panjang ${TASK_DRAFT_TEXT_MAX} karakter. Persingkat, atau bagi jadi dua kali susun.`,
  notWorker: (name: string) => `"${name}" bukan Pengelola atau Anggota proyek ini.`,
  ambiguousName: (name: string) => `Ada lebih dari satu anggota yang cocok dengan "${name}".`,
  whichOne: (name: string) => `${name} yang mana?`,
  selfNotWorker: 'Kamu bukan Pengelola atau Anggota proyek ini.',
  rateLimited: (seconds: number) =>
    `Terlalu sering memakai Tulis saja. Coba lagi dalam ${seconds} detik, atau isi form saja.`,
} as const;
