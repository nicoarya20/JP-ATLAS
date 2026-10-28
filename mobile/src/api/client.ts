/**
 * The one way this app talks to the Simple PM server.
 *
 * Mobile consumes the same `/api/app/*` endpoints the web does — there are no mobile-only
 * endpoints — so everything here is transport: where the server is, which headers go out, and
 * how a failure is reported. Plain `fetch`; no HTTP library and no query cache at this layer.
 *
 * Sign-in is not handled here. `./auth` owns the session; once a session exists, call
 * `setAuthHeaders` once with a provider that returns the stored cookie, and every request
 * made through `api*` carries it.
 */
import { ApiError, type ApiErrorBody, apiErrorFromResponse, CLIENT_CODES } from './errors';

/** How long to wait for the server before giving up. Phones change networks mid-request. */
export const REQUEST_TIMEOUT_MS = 15_000;

const JSON_HEADERS = { accept: 'application/json' } as const;

/** Messages for failures the server never saw. UI copy in mobile/ is English. */
const CLIENT_MESSAGES = {
  NO_BASE_URL:
    'The server address is not set. Add EXPO_PUBLIC_API_URL to mobile/.env and restart Expo.',
  NETWORK: 'Cannot reach the server. Check your connection and that EXPO_PUBLIC_API_URL is right.',
  TIMEOUT: 'The server took too long to answer. Try again.',
  ABORTED: 'Request cancelled.',
  BAD_RESPONSE: 'The server sent something this app could not read. Try again.',
  HTTP: 'The request failed. Try again.',
} as const;

type HeaderProvider = () => Record<string, string> | Promise<Record<string, string>>;

let authHeaderProvider: HeaderProvider | null = null;

/**
 * Registers the provider that supplies per-request auth headers (the session cookie from
 * `./auth`). Pass null to clear it, e.g. after sign-out or between tests.
 */
export function setAuthHeaders(provider: HeaderProvider | null): void {
  authHeaderProvider = provider;
}

/**
 * Base URL of the server, from EXPO_PUBLIC_API_URL.
 *
 * Read on every call, not at import time, so a changed env value takes effect on reload.
 * The member access is written out in full because Expo inlines only the literal form.
 * Throws rather than falling back to a hardcoded host: a wrong silent default would send a
 * real session somewhere unexpected.
 */
export function apiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new ApiError({
      message: CLIENT_MESSAGES.NO_BASE_URL,
      code: CLIENT_CODES.NO_BASE_URL,
      status: 0,
    });
  }
  // A trailing slash would turn `/api/app/home` into a double slash the router does not match.
  return raw.replace(/\/+$/, '');
}

/** Absolute URL for a server path. `path` is server-absolute, e.g. `/api/app/home`. */
export function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export type ApiRequestOptions = {
  method?: string;
  /** Serialised as JSON; sets content-type. Use `rawBody` for anything else. */
  body?: unknown;
  rawBody?: BodyInit;
  headers?: Record<string, string>;
  /** Caller's own abort signal; composed with the timeout. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** Headers for one request: defaults, then the auth provider, then the caller's own. */
async function buildHeaders(options: ApiRequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (authHeaderProvider) Object.assign(headers, await authHeaderProvider());
  return Object.assign(headers, options.headers);
}

/** Turns a thrown fetch failure into an ApiError. Nothing is swallowed: the cause is kept. */
function transportError(cause: unknown, timedOut: boolean, callerAborted: boolean): ApiError {
  if (timedOut) {
    return new ApiError({
      message: CLIENT_MESSAGES.TIMEOUT,
      code: CLIENT_CODES.TIMEOUT,
      status: 0,
      cause,
    });
  }
  if (callerAborted) {
    return new ApiError({
      message: CLIENT_MESSAGES.ABORTED,
      code: CLIENT_CODES.ABORTED,
      status: 0,
      cause,
    });
  }
  return new ApiError({
    message: CLIENT_MESSAGES.NETWORK,
    code: CLIENT_CODES.NETWORK,
    status: 0,
    cause,
  });
}

/**
 * Sends one request and returns the raw Response. Throws ApiError when the request never got
 * an answer; an HTTP error status comes back as a Response for the JSON helpers to map.
 */
export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const url = apiUrl(path);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort);

  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers: await buildHeaders(options),
      body:
        options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: controller.signal,
    });
  } catch (cause) {
    throw transportError(cause, timedOut, Boolean(options.signal?.aborted));
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * Reads a JSON body. A body that will not parse is reported, not swallowed (§11): the parse
 * error comes back as `failure` so the caller can attach it as the ApiError's cause.
 */
async function readJson(
  response: Response,
): Promise<{ body: unknown; failure: unknown } | { body: unknown; failure?: never }> {
  if (response.status === 204) return { body: null };
  try {
    return { body: await response.json() };
  } catch (failure) {
    return { body: null, failure };
  }
}

/**
 * Sends one request and returns the parsed JSON body.
 *
 * Throws ApiError for every failure: the server's `{ error, code, status, requestId }` for an
 * HTTP error, a CLIENT_CODES error for a transport failure or a body that is not JSON.
 */
export async function apiJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiRequest(path, options);
  const { body, failure } = await readJson(response);

  if (!response.ok) throw apiErrorFromResponse(response, body, CLIENT_MESSAGES.HTTP, failure);
  if (response.status === 204) return undefined as T;
  if (body === null) {
    throw new ApiError({
      message: CLIENT_MESSAGES.BAD_RESPONSE,
      code: CLIENT_CODES.BAD_RESPONSE,
      status: response.status,
      requestId: response.headers.get('x-request-id'),
      cause: failure,
    });
  }
  return body as T;
}

export const apiGet = <T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) =>
  apiJson<T>(path, { ...options, method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
  apiJson<T>(path, { ...options, method: 'POST', body });

export const apiPatch = <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
  apiJson<T>(path, { ...options, method: 'PATCH', body });

export const apiDelete = <T>(path: string, options: ApiRequestOptions = {}) =>
  apiJson<T>(path, { ...options, method: 'DELETE' });

export { ApiError, type ApiErrorBody, CLIENT_CODES, CLIENT_MESSAGES };
