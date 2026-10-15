/** Builds the uniform `{ error, code }` API body from the PM error catalog (server-only). */
import { type DenyCode, PM_ERRORS, type PmCode, type PmHttp } from './errors';

export type PmErrorBody = { error: string; code: PmCode; [extra: string]: unknown };

/** A refused policy decision; structurally the `{ ok: false }` arm of `Decision`. */
export type DeniedDecision = { ok: false; code: DenyCode };

/** Elysia's handler `status` function, narrowed to what `fail` needs. */
type StatusFn<R> = (http: PmHttp, body: PmErrorBody) => R;

/**
 * Calls the handler `status` with the catalog status and body for `code`.
 * `extra.error` may refine a 4xx message; 5xx always keep the catalog text so
 * internals never reach the client.
 */
export function fail<R>(status: StatusFn<R>, code: PmCode, extra: Record<string, unknown> = {}): R {
  const { http, message } = PM_ERRORS[code];
  const { error, ...rest } = extra;
  const text = http < 500 && typeof error === 'string' && error ? error : message;
  return status(http, { ...rest, error: text, code });
}

/** Maps a refused `Decision` to its HTTP status and body; the caller passes both to `status`. */
export function denyResponse(decision: DeniedDecision): { http: PmHttp; body: PmErrorBody } {
  const { http, message } = PM_ERRORS[decision.code];
  return { http, body: { error: message, code: decision.code } };
}
