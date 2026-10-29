/**
 * Hosts the web app is reachable as, for Better Auth's dynamic `baseURL` (its `allowedHosts`).
 *
 * The web app can be served from several origins at once, and login must work from each without
 * editing `.env` when you switch between them:
 *  - localhost on any port (dev: `:3005`, `:4007`, …) — loopback, always allowed;
 *  - the canonical public host taken from `APP_URL` / `BETTER_AUTH_URL`
 *    (e.g. `simple-pm.wibudev.com`) — set once, usually the same value you want for SEO anyway.
 *
 * Better Auth resolves the per-request base URL from the request host (honouring the reverse
 * proxy's `x-forwarded-host` / `x-forwarded-proto` when `advanced.trustedProxyHeaders` is on) and
 * accepts a host only when it matches one of these patterns — anything else falls back to
 * `BETTER_AUTH_URL`. So this allowlist is the guard against a spoofed `Host`/`x-forwarded-host`
 * header: keep it to loopback plus hosts you actually own.
 *
 * Matching uses the same wildcard rules as `trustedOrigins` (see @better-auth matchesHostPattern),
 * so `localhost:*` matches `localhost:4007`, and an exact host matches only itself.
 */

/** Loopback host patterns (any port), always trusted for local development. */
export const LOCAL_HOST_PATTERNS: readonly string[] = ['localhost:*', '127.0.0.1:*', '[::1]:*'];

/** True when a `host[:port]` is a loopback address already covered by {@link LOCAL_HOST_PATTERNS}. */
export function isLoopbackHostPort(host: string): boolean {
  const name = host
    .replace(/:\d+$/, '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  return (
    name === 'localhost' || name.endsWith('.localhost') || name === '::1' || name.startsWith('127.')
  );
}

/** `host[:port]` (lower-cased, no scheme) of a URL string, or null when it cannot be parsed. */
export function hostOfUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * `allowedHosts` for Better Auth: loopback (any port) plus the canonical public hosts derived from
 * the given URLs (APP_URL, BETTER_AUTH_URL). De-duped; loopback hosts already covered by the
 * wildcards are dropped so the list stays to the point.
 */
export function buildWebAllowedHosts(urls: readonly (string | null | undefined)[]): string[] {
  const extras = urls
    .map(hostOfUrl)
    .filter((h): h is string => Boolean(h))
    .filter((h) => !isLoopbackHostPort(h));
  return [...new Set([...LOCAL_HOST_PATTERNS, ...extras])];
}

/**
 * Whether to stamp `x-forwarded-proto: https` on an incoming request.
 *
 * A reverse proxy / tunnel (frp, ngrok, …) that terminates TLS but forwards to the app over plain
 * HTTP without `x-forwarded-proto` makes the app build an `http://<domain>` base URL — which breaks
 * secure cookies and produces an OAuth `redirect_uri` that Google rejects (`redirect_uri_mismatch`,
 * since only the `https://` callback is registered). For a public (non-loopback) host the scheme is
 * always https in practice, so force it; localhost stays http (its callback is registered as http
 * and it is reached directly, not through the proxy). No-op when the proxy already set https.
 */
export function shouldForcePublicHttps(
  forwardedHost: string | null | undefined,
  forwardedProto: string | null | undefined,
): boolean {
  if (!forwardedHost) return false;
  if (isLoopbackHostPort(forwardedHost)) return false;
  return forwardedProto !== 'https';
}
