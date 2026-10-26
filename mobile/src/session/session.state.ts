/**
 * Who is signed in, as the app sees it. One store, read by the session gate (app/_layout.tsx) and
 * by the sign-in screens; `session.actions.ts` is the only thing that writes to it.
 *
 * The server stays the authority. `statusOfUser` mirrors its rules so the gate can decide from the
 * session payload alone, without a second round trip, and `statusFromApiError` corrects that
 * decision from the 401/403 any `/api/app/*` call answers with — so a status change the phone has
 * not noticed yet (an Admin approving, or rejecting, mid-session) lands on the next request.
 */
import type { ApiError } from '@/api';
import { createStore, useStore } from '@/data/store';

/**
 * Where the app may send someone:
 * - `loading` — the stored session has not been read yet; show nothing, not the app.
 * - `signed-out` — no session: the sign-in screen.
 * - `pending` / `rejected` — signed in but held by the server: the waiting and denied screens.
 * - `signed-in` — approved: the app's own screens.
 * - `unreachable` — the server could not be asked at all; retrying is the only honest offer.
 */
export type SessionStatus =
  | 'loading'
  | 'signed-out'
  | 'pending'
  | 'rejected'
  | 'signed-in'
  | 'unreachable';

/** The account behind the session, as `/api/auth/get-session` reports it. */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  /** `approved` | `pending` | `rejected` as the server stores it; see statusOfUser for the rest. */
  approvalStatus: string | null;
  /** The Admin's reason for turning the account down, in Indonesian, shown as it came (K5). */
  approvalReason: string | null;
  banned: boolean;
  banReason: string | null;
  /** ISO timestamp a temporary suspension lifts, or null when it is permanent. */
  banExpires: string | null;
};

/**
 * Today's date and the team's time zone, as `GET /api/app/home` reports them (K1: there is no
 * endpoint of its own for the clock). Null until that call lands — which is Phase 2 step 3 — and
 * no screen may quietly fall back to the phone's own clock while it is null.
 */
export type SessionClock = { today: string; timeZone: string };

export type SessionState = {
  status: SessionStatus;
  user: SessionUser | null;
  clock: SessionClock | null;
  /** Why the session could not be read; set only while `status` is `unreachable`. */
  error: ApiError | null;
};

export const INITIAL_SESSION: SessionState = {
  status: 'loading',
  user: null,
  clock: null,
  error: null,
};

export const sessionStore = createStore<SessionState>(INITIAL_SESSION);

/** The whole session state, re-rendering the component when any part of it changes. */
export const useSession = () => useStore(sessionStore);

/** True only for an approved account: everything else belongs to the `(auth)` stack. */
export const useAppAllowed = () => useStore(sessionStore, (s) => s.status === 'signed-in');

/** Banned, and either permanently or with an expiry still ahead. Mirrors server/ban.ts. */
export function isBanned(user: SessionUser, now = Date.now()): boolean {
  if (!user.banned) return false;
  if (!user.banExpires) return true;
  return new Date(user.banExpires).getTime() > now;
}

/**
 * The status a session payload proves. Mirrors `heldKindOf` in server/account/status.ts: an active
 * ban wins over approval, and anything that is not exactly `approved` or `rejected` — a missing
 * value included — counts as pending, so an unexpected payload fails closed.
 *
 * A ban lands on `signed-out` on purpose: the server gives a suspension no 403 code of its own
 * (X3 M18) and answers like a signed-out caller, so the phone does the same. Signing in again
 * then fails with the server's own ban message instead of this app inventing one.
 */
export function statusOfUser(user: SessionUser | null, now = Date.now()): SessionStatus {
  if (!user) return 'signed-out';
  if (isBanned(user, now)) return 'signed-out';
  if (user.approvalStatus === 'approved') return 'signed-in';
  return user.approvalStatus === 'rejected' ? 'rejected' : 'pending';
}

/** The 403 codes a held account gets from `/api/app/*` (server/account/gate.ts), plus the 401. */
const STATUS_BY_CODE: Record<string, SessionStatus> = {
  ACCOUNT_PENDING: 'pending',
  ACCOUNT_REJECTED: 'rejected',
  UNAUTHORIZED: 'signed-out',
};

/**
 * The status an API failure proves, or null when it says nothing about the session (a 404, a
 * validation error, or any transport failure — a request that never arrived proves nothing).
 */
export function statusFromApiError(error: ApiError): SessionStatus | null {
  if (error.isTransport) return null;
  const byCode = STATUS_BY_CODE[error.code];
  if (byCode) return byCode;
  return error.status === 401 ? 'signed-out' : null;
}

/** Records the account the server reported (or its absence) and the status that follows. */
export function setSessionUser(user: SessionUser | null): SessionStatus {
  const status = statusOfUser(user);
  sessionStore.set((prev) => ({ ...prev, status, user, error: null }));
  return status;
}

/** Moves the session to a status the server proved, keeping the account already on record. */
export function setSessionStatus(status: SessionStatus): void {
  sessionStore.set((prev) => ({ ...prev, status, error: null }));
}

/** The server could not be asked; the error is kept so the retry screen can say why. */
export function setSessionUnreachable(error: ApiError): void {
  sessionStore.set((prev) => ({ ...prev, status: 'unreachable', error }));
}

/** Records the clock from `GET /api/app/home` (K1). */
export function setSessionClock(clock: SessionClock): void {
  sessionStore.set((prev) => ({ ...prev, clock }));
}

/** Back to signed out, with nothing of the account left in memory. */
export function clearSession(): void {
  sessionStore.set({ ...INITIAL_SESSION, status: 'signed-out' });
}

/**
 * Lets an API failure correct the session. Call it wherever an `/api/app/*` failure is handled:
 * an approval that was withdrawn, or granted, reaches the gate on the next request instead of
 * waiting for a restart. Returns the status it applied, or null when the error proved nothing.
 */
export function applyApiError(error: ApiError): SessionStatus | null {
  const proven = statusFromApiError(error);
  if (!proven) return null;
  if (proven === 'signed-out') clearSession();
  else setSessionStatus(proven);
  return proven;
}
