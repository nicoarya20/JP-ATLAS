/**
 * Better Auth's failures, turned into the one `ApiError` the rest of the app already handles.
 *
 * `/api/auth/*` is mounted as Better Auth's own handler, so its errors do **not** carry our
 * `{ error, code, status, requestId }` shape — they come back as `{ code, message }` with Better
 * Auth's own English wording ("Invalid email or password", "You have been banned from this
 * application"). That wording is shown as it came: this app does not keep a second copy of a
 * message the server already writes (K5).
 *
 * Its client also has no timeout and does not catch a failed fetch, so a request that never
 * arrives throws rather than returning `{ error }`. Both paths end up here.
 */
import { ApiError, CLIENT_CODES, CLIENT_MESSAGES, isApiError } from '@/api';

/** The error object Better Auth's client returns: its own code and message, plus the status. */
export type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

/** An HTTP failure Better Auth answered with. `status` is real, so `isTransport` stays false. */
export function authFailureError(failure: AuthFailure): ApiError {
  const status = typeof failure.status === 'number' && failure.status > 0 ? failure.status : 500;
  return new ApiError({
    message: failure.message?.trim() || CLIENT_MESSAGES.HTTP,
    code: failure.code?.trim() || `HTTP_${status}`,
    status,
    cause: failure,
  });
}

/**
 * A failure that never got an answer: no network, the wrong address, or our own timeout firing.
 * `status: 0` makes `isTransport` true, which is what tells a screen to offer "Try again".
 */
export function transportApiError(cause: unknown, timedOut = false): ApiError {
  const aborted = timedOut || (cause instanceof Error && cause.name === 'AbortError');
  return new ApiError({
    message: aborted ? CLIENT_MESSAGES.TIMEOUT : CLIENT_MESSAGES.NETWORK,
    code: aborted ? CLIENT_CODES.TIMEOUT : CLIENT_CODES.NETWORK,
    status: 0,
    cause,
  });
}

/** Any thrown value as an ApiError, keeping one that already is. */
export function asApiError(cause: unknown, timedOut = false): ApiError {
  return isApiError(cause) ? cause : transportApiError(cause, timedOut);
}
