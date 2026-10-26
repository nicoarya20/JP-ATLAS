/**
 * Length rules for a password the owner types in (no `env`/`db` imports, so the browser bundle and
 * the CLI can read them too). The numbers mirror Better Auth's own `minPasswordLength` /
 * `maxPasswordLength` defaults: checking them here turns a 400 in English into our 422, and keeps
 * Better Auth as the last line rather than the first.
 */

export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;

export type PasswordProblem = 'not_text' | 'too_short' | 'too_long';

/** What is wrong with a password the client sent, or null when the length is usable. */
export function passwordProblem(value: unknown): PasswordProblem | null {
  if (typeof value !== 'string') return 'not_text';
  if (value.length < PASSWORD_MIN_LEN) return 'too_short';
  if (value.length > PASSWORD_MAX_LEN) return 'too_long';
  return null;
}

/**
 * The sentence shown for a problem. Deliberately built from the constants alone: a message must
 * never quote, echo or measure the password the caller sent (CLAUDE.md §12 — it would travel into
 * the response body, and from there into a browser console or a log collector).
 */
export function passwordProblemMessage(problem: PasswordProblem): string {
  if (problem === 'too_long') return `Password maksimal ${PASSWORD_MAX_LEN} karakter.`;
  if (problem === 'too_short') return `Password minimal ${PASSWORD_MIN_LEN} karakter.`;
  return 'Password harus berupa teks.';
}
