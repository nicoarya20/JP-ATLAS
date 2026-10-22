/**
 * Pure auth policy helpers (no `env`/`db` imports): `isProd` is always a parameter so they stay
 * unit-testable and safe to import from the CLI, which runs before `.env` is valid.
 */

const EMAIL_SIGN_UP_SUFFIX = '/sign-up/email';

/** Email+password is a dev/test convenience only; production signs in with Google (R12 F1). */
export function emailPasswordEnabled(isProd: boolean): boolean {
  return !isProd;
}

/**
 * True for the email sign-up endpoint, with or without the `/api/auth` base path, ignoring query
 * string, trailing slashes and case. Matching is deliberately broad: a false positive only
 * blocks an endpoint that does not exist, a false negative would leave sign-up open.
 */
export function isEmailSignUpPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const bare = (path.split(/[?#]/, 1)[0] ?? '').replace(/\/+$/, '').toLowerCase();
  return bare.endsWith(EMAIL_SIGN_UP_SUFFIX);
}
