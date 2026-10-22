import { emailPasswordEnabled, isEmailSignUpPath } from '../account/auth-policy';
import { newRequestId, notFoundResponse } from '../api-error';
import { auth } from '../auth';
import { isProd } from '../env';
import { PM_ERRORS } from '../pm/errors';

const AUTH_BASE = '/api/auth';
const ADMIN_ROOT = '/admin';
/** The only Better Auth admin endpoints the client calls; everything else goes through /api/admin. */
const ADMIN_ALLOWLIST: ReadonlySet<string> = new Set([
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
]);
const SIGN_IN_EMAIL = '/sign-in/email';
const DELETE_USER = '/delete-user';
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Outcome of the path gate: forward, answer 404, or forward only when the session is not impersonated. */
export type AuthGateVerdict = 'pass' | 'not-found' | 'check-impersonation';

/**
 * Path relative to `/api/auth` in one canonical form (decoded, lower-case, no `//`, no trailing
 * `/`), or null when it is not under `/api/auth` or cannot be canonicalised safely.
 * Decode first, lower-case after: `%41dmin` must not survive as `Admin`.
 */
export function normalizeAuthPath(pathname: string): string | null {
  let p: string;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  // A second layer of encoding or a dot segment means somebody is probing parser differences.
  if (p.includes('%')) return null;
  p = p
    .toLowerCase()
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
  if (p.split('/').some((s) => s === '.' || s === '..')) return null;
  if (p !== AUTH_BASE && !p.startsWith(`${AUTH_BASE}/`)) return null;
  return p.slice(AUTH_BASE.length) || '/';
}

/** Decide what to do with a request under the `/api/auth` mount, before Better Auth sees it. */
export function evaluateAuthPath(
  pathname: string,
  method: string,
  opts: { isProd: boolean },
): AuthGateVerdict {
  const path = normalizeAuthPath(pathname);
  if (path === null) return 'not-found';
  // Allowlist, not a deny list: endpoints a future Better Auth release adds stay closed.
  if (path === ADMIN_ROOT || path.startsWith(`${ADMIN_ROOT}/`))
    return ADMIN_ALLOWLIST.has(path) ? 'pass' : 'not-found';
  if (!emailPasswordEnabled(opts.isProd) && (isEmailSignUpPath(path) || path === SIGN_IN_EMAIL))
    return 'not-found';
  if (!SAFE_METHODS.has(method.toUpperCase()) && isDeleteUserPath(path))
    return 'check-impersonation';
  return 'pass';
}

function isDeleteUserPath(path: string): boolean {
  return path === DELETE_USER || path.startsWith(`${DELETE_USER}/`);
}

async function isImpersonated(request: Request): Promise<boolean> {
  try {
    const s = await auth.api.getSession({ headers: request.headers });
    return Boolean(s?.session.impersonatedBy);
  } catch (e) {
    // Fail closed: if the session cannot be read we cannot prove it is not an impersonation.
    throw new Error(`Failed to read session for ${DELETE_USER}: ${(e as Error).message}`);
  }
}

function impersonatingResponse(): Response {
  const requestId = newRequestId();
  const body = {
    error: PM_ERRORS.IMPERSONATING.message,
    code: 'IMPERSONATING',
    status: 403,
    requestId,
  };
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-request-id': requestId,
    },
  });
}

/** Build the `/api/*` mount handler: gate the path, then hand allowed requests to Better Auth. */
export function createAuthMount(prod: boolean) {
  return async (request: Request): Promise<Response> => {
    const verdict = evaluateAuthPath(new URL(request.url).pathname, request.method, {
      isProd: prod,
    });
    if (verdict === 'not-found') return notFoundResponse(request);
    if (verdict === 'check-impersonation' && (await isImpersonated(request)))
      return impersonatingResponse();
    return auth.handler(request);
  };
}

/** Mount handler wired to the process environment (404 for everything outside the gate). */
export const authMount = createAuthMount(isProd);
