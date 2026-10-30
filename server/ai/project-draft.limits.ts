/**
 * Fixed limits and Indonesian messages of "Ceritakan proyeknya". Pure: no env reads, so the future UI
 * can import the text limit and the messages. Provider settings (key, model, timeout, token budget)
 * are read from the environment at call time in `ai.config.ts`, shared with "Tulis saja ✦".
 */

/** Longest story the endpoint accepts, counted after trimming; twice `TASK_DRAFT_TEXT_MAX` because a
 * project story is naturally longer than a one-task story (plan §12, question 1). */
export const PROJECT_DRAFT_TEXT_MAX = 4000;

/**
 * Most phases and most tasks (summed across every phase plus the loose ones) one story may yield.
 * Both are well under the real ceilings (`PHASES_PER_PROJECT` = 20, no task-count ceiling) on purpose:
 * a first draft stays short enough to review on a phone and to fit the shared token budget
 * (`aiConfig().maxTokens`, plan §4.5 — whether the current cap is enough is still open, plan §12).
 */
export const PROJECT_DRAFT_PHASES_MAX = 6;
export const PROJECT_DRAFT_TASKS_MAX = 20;

/** Longest open question that leaves the server when the story is too unclear to draft anything. */
export const PROJECT_DRAFT_QUESTION_MAX = 200;

/** Error codes of the endpoint, besides the shared PM codes (`NOT_APP_ROLE`, ...). Same shape as
 * `TASK_DRAFT_CODES` so the client can treat both the same way. */
export const PROJECT_DRAFT_CODES = {
  disabled: 'AI_DISABLED',
  unavailable: 'AI_UNAVAILABLE',
  textEmpty: 'TEXT_EMPTY',
  textTooLong: 'TEXT_TOO_LONG',
} as const;

/** Messages the form shows as is; the fallback sentence tells the user what to do next. */
export const PROJECT_DRAFT_MESSAGES = {
  disabled: 'Ceritakan proyeknya belum diaktifkan di aplikasi ini. Isi form saja.',
  unavailable: 'Ceritakan proyeknya belum bisa dipakai sekarang. Isi form saja.',
  textEmpty: 'Tulis dulu ceritanya, baru bisa disusun.',
  textTooLong: `Tulisan paling panjang ${PROJECT_DRAFT_TEXT_MAX} karakter. Persingkat, atau bagi jadi dua kali susun.`,
  rateLimited: (seconds: number) =>
    `Terlalu sering memakai Ceritakan proyeknya. Coba lagi dalam ${seconds} detik, atau isi form saja.`,
} as const;
