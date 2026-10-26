/**
 * Trusted origins for the React Native app (mobile/).
 *
 * Better Auth always trusts the `baseURL` origin, so web cookie sessions need nothing here.
 * The mobile app adds two kinds of origin:
 *  - its own deep-link scheme (`simplepm://`), which belongs to the app, not to the environment,
 *    so it is a constant here and mirrors `scheme` in mobile/app.config.ts;
 *  - whatever the machine running the dev server is reachable as (LAN IP, tunnel host, a staging
 *    origin), which differs per developer and per network — that part comes from
 *    MOBILE_TRUSTED_ORIGINS and is never hardcoded (CLAUDE.md §15).
 *
 * `@better-auth/expo` contributes `exp://` itself while NODE_ENV=development, and Better Auth
 * merges plugin origins with these, so Expo Go needs no entry either.
 */

/** Deep-link scheme of the app; keep in sync with `scheme` in mobile/app.config.ts. */
export const MOBILE_APP_ORIGIN = 'simplepm://';

/**
 * `<scheme>://` followed by an optional authority: an RFC 3986 scheme, then anything without
 * whitespace, so `simplepm://`, `http://192.168.1.10:3005` and Better Auth's wildcard patterns
 * (`exp://192.168.*.*:*\/**`) all pass while a bare host or a bare scheme does not.
 */
const ORIGIN_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S*$/;

/** Splits a comma-separated MOBILE_TRUSTED_ORIGINS value into trimmed, non-empty, de-duped entries. */
export function splitOriginList(raw: string | null | undefined): string[] {
  return [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
    ),
  ];
}

/** Entries that are not `<scheme>://<something>` (used to fail boot on a typo). */
export function invalidOriginEntries(entries: readonly string[]): string[] {
  return entries.filter((e) => !ORIGIN_PATTERN.test(e));
}

/**
 * Origins handed to Better Auth: the app scheme first, then the configured extras.
 * An empty env value means "no extras", not "no mobile" — the scheme always stays.
 */
export function buildMobileTrustedOrigins(extras: readonly string[]): readonly string[] {
  return [...new Set([MOBILE_APP_ORIGIN, ...extras])];
}
