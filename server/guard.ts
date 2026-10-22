import { eq } from 'drizzle-orm';
import { redirect } from 'react-router';
import { accountGateResponse } from './account/gate';
import { type AccountStatusFields, type HeldKind, heldKindOf } from './account/status';
import { getApiKeyIdentity } from './api-keys/identity';
import { auth } from './auth';
import { db } from './db';
import { user as userTable } from './db/schema';
import { homeFor, ROLES, type Role } from './permissions';
import { resolveUserRole } from './roles';

/**
 * Layout guard for strict per-role areas. Enforces an authenticated session and
 * that the resolved role matches the area. A logged-in user hitting the wrong
 * area is bounced to their own home (see homeFor); anonymous users go to /login.
 * Returns the session user + resolved role for the area to render.
 */
export async function requireRole(request: Request, required: Role) {
  return requireAnyRole(request, [required]);
}

/**
 * Like requireRole but accepts any role in `allowed`. Used where a higher role
 * is a superset of a lower one — e.g. super-admin may enter the admin area.
 */
export async function requireAnyRole(request: Request, allowed: readonly Role[]) {
  const actor = await resolveActor(request);
  if (!actor) throw redirect(signedOutTarget(request));
  if (!allowed.includes(actor.role)) throw redirect(homeFor(actor.role));
  return actor;
}

/** Any signed-in role — the guard for every /app page loader (loaders run in parallel with the layout's). */
export async function requireUser(request: Request) {
  return requireAnyRole(request, Object.values(ROLES));
}

const SESSION_COOKIE = /(^|;\s*)(__Secure-)?better-auth\.session_token=/;
/** A session cookie was sent but no session came back: expired, revoked, or the account is gone. */
export function hadSessionCookie(request: Request): boolean {
  return SESSION_COOKIE.test(request.headers.get('cookie') ?? '');
}

type SessionUser = (typeof auth)['$Infer']['Session']['user'];
/** An authenticated account that may not proceed: suspended, pending or rejected. */
export type HeldAccount = { user: SessionUser; kind: HeldKind };

const heldRequests = new WeakMap<Request, HeldAccount>();
/** The held account behind a request that resolveActor rejected, if any. */
export function getHeldAccount(request: Request): HeldAccount | null {
  return heldRequests.get(request) ?? null;
}
/** The banned session user behind a rejected request, if any (kept for older callers). */
export function getBannedUser(request: Request): SessionUser | null {
  const held = getHeldAccount(request);
  return held?.kind === 'banned' ? held.user : null;
}

/**
 * Where an unauthenticated page request goes: banned users to /banned, pending
 * or rejected accounts to /waiting, users whose session just vanished to /login
 * with a notice, everyone else to /login.
 */
export function signedOutTarget(request: Request): string {
  const kind = getHeldAccount(request)?.kind;
  if (kind === 'banned') return '/banned';
  if (kind) return '/waiting';
  return hadSessionCookie(request) ? '/login?notice=session' : '/login';
}

/** `impersonatedBy`: id of the admin driving the session. */
export type Actor = {
  user: SessionUser;
  role: Role;
  viaApiKey: boolean;
  impersonatedBy: string | null;
};

/**
 * Throws a JSON Response when the account behind `actor` is held. resolveActor
 * already returns null for those; this guards Actors built some other way (S0.b).
 */
export function assertAccountApproved(actor: { user: AccountStatusFields }): void {
  const kind = heldKindOf(actor.user);
  if (!kind) return;
  const gate = accountGateResponse({ kind });
  // A banned account has no 403 code of its own (X3 M18): it answers like a signed-out caller.
  const body = gate ?? { error: 'Silakan masuk terlebih dahulu.', code: 'UNAUTHORIZED' };
  throw new Response(JSON.stringify(body), {
    status: gate ? 403 : 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/**
 * Who is calling: an API-key identity (scope already enforced) or the cookie
 * session. Null when anonymous, and null for a held account on both paths so no
 * guard can let one through by forgetting to check (reason: getHeldAccount).
 */
export async function resolveActor(request: Request): Promise<Actor | null> {
  const key = getApiKeyIdentity(request);
  if (key) {
    // Full row so callers (layouts, admin API) see the same shape as a session user.
    const [row] = await db.select().from(userTable).where(eq(userTable.id, key.user.id)).limit(1);
    if (!row) return null;
    const user = row as unknown as SessionUser;
    const kind = heldKindOf(row);
    if (kind) {
      heldRequests.set(request, { user, kind });
      return null;
    }
    return {
      user,
      role: key.role,
      viaApiKey: true,
      impersonatedBy: null,
    };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  // Better Auth only blocks *new* sessions for banned users and ignores approval, so
  // an existing session is held here; status is fresh per request (no cookieCache).
  const kind = heldKindOf(session.user as AccountStatusFields);
  if (kind) {
    heldRequests.set(request, { user: session.user, kind });
    return null;
  }
  return {
    user: session.user,
    role: await resolveUserRole(session.user),
    viaApiKey: false,
    impersonatedBy: session.session?.impersonatedBy ?? null,
  };
}

/**
 * Post-auth resolver used by /go: send an authenticated user to their role's
 * home. Role is unknown at OAuth callback time, so login funnels through here.
 */
export async function redirectToHome(request: Request): Promise<never> {
  const actor = await resolveActor(request);
  if (!actor) throw redirect(signedOutTarget(request));
  throw redirect(homeFor(actor.role));
}
