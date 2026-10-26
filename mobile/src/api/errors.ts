/**
 * One error type for every API failure, so screens never have to guess what went wrong.
 *
 * The server answers every /api failure with `{ error, code, status, requestId }` (see the root
 * CLAUDE.md, "Konvensi Server"), and those four fields are carried through unchanged — `error`
 * is the server's own message, in Indonesian, ready to show. Failures that never reach the
 * server (no network, timeout, unreadable body) get `status: 0` and one of the CLIENT_CODES,
 * with an English message of our own, because there is no server message to show.
 */

/** Codes for failures raised by the client itself; `status` is 0 for all of them. */
export const CLIENT_CODES = {
  /** EXPO_PUBLIC_API_URL is missing or not a URL — the app cannot know where the server is. */
  NO_BASE_URL: 'NO_BASE_URL',
  /** The request never reached the server: no network, wrong IP, server not running. */
  NETWORK: 'NETWORK',
  /** The server did not answer within the timeout. */
  TIMEOUT: 'TIMEOUT',
  /** The caller aborted the request (e.g. the screen was left). */
  ABORTED: 'ABORTED',
  /** A response arrived but its body was not the JSON the contract promises. */
  BAD_RESPONSE: 'BAD_RESPONSE',
} as const;

export type ClientCode = (typeof CLIENT_CODES)[keyof typeof CLIENT_CODES];

/** A validation issue as the server's 422 reports it. */
export type ApiIssue = { path: string; message: string };

/** The JSON body every /api failure carries. */
export type ApiErrorBody = {
  error: string;
  code: string;
  status: number;
  requestId: string;
  issues?: ApiIssue[];
};

/** Everything a screen may need to react to a failure. Thrown, never returned, never swallowed. */
export class ApiError extends Error {
  /** Stable machine-readable code: the server's `code`, or one of CLIENT_CODES. */
  readonly code: string;
  /** HTTP status, or 0 when the request never got an HTTP answer. */
  readonly status: number;
  /** Server-side correlation id; null for a client-side failure. Quote it when reporting a bug. */
  readonly requestId: string | null;
  /** Field-level problems from a 422. */
  readonly issues: readonly ApiIssue[];

  constructor(init: {
    message: string;
    code: string;
    status: number;
    requestId?: string | null;
    issues?: readonly ApiIssue[];
    cause?: unknown;
  }) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId ?? null;
    this.issues = init.issues ?? [];
  }

  /** True when the request never reached the server, so retrying is worth offering. */
  get isTransport(): boolean {
    return this.status === 0;
  }
}

/** Narrows an unknown thrown value; `instanceof` alone breaks across module instances in tests. */
export const isApiError = (e: unknown): e is ApiError =>
  e instanceof ApiError || (e instanceof Error && e.name === 'ApiError');

const isIssue = (v: unknown): v is ApiIssue =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ApiIssue).path === 'string' &&
  typeof (v as ApiIssue).message === 'string';

/**
 * Builds an ApiError from a failed response. The server's shape is used when it is there;
 * a response that does not follow the contract (a proxy's HTML 502, say) still produces a
 * usable error instead of an empty message.
 */
export function apiErrorFromResponse(
  response: Response,
  body: unknown,
  fallbackMessage: string,
): ApiError {
  const shape = (typeof body === 'object' && body !== null ? body : {}) as Partial<ApiErrorBody>;
  const issues = Array.isArray(shape.issues) ? shape.issues.filter(isIssue) : [];
  return new ApiError({
    message: typeof shape.error === 'string' && shape.error ? shape.error : fallbackMessage,
    code: typeof shape.code === 'string' && shape.code ? shape.code : `HTTP_${response.status}`,
    status: response.status,
    requestId:
      (typeof shape.requestId === 'string' ? shape.requestId : null) ??
      response.headers.get('x-request-id'),
    issues,
  });
}
