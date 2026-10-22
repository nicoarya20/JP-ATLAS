/**
 * Client for the uniform `/api` error shape `{ error, code, status, requestId, issues? }`
 * (server/api-error.ts). Used by the S1/S2 slices; the older `app/lib/*-api.ts` clients keep
 * their own `request()` on purpose and are not touched here.
 */

/** Where an expired session lands; `notice=session` makes the login page explain why. */
export const SESSION_EXPIRED_PATH = '/login?notice=session';
const LOGIN_PATH_PREFIX = '/login';
const REQUEST_ID_HEADER = 'x-request-id';
const UNKNOWN_CODE = 'UNKNOWN';

export type ApiIssue = { path: string; message: string };

/** Raised for every non-2xx answer, carrying what support needs to trace it (`requestId`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly issues?: ApiIssue[];
  /** False when the body carried no `error` text, so the message is only a status stub. */
  readonly hasServerMessage: boolean;

  constructor(init: {
    message?: string;
    status: number;
    code?: string;
    requestId?: string;
    issues?: ApiIssue[];
  }) {
    super(init.message ?? `Permintaan gagal (${init.status})`);
    this.hasServerMessage = init.message !== undefined;
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code ?? UNKNOWN_CODE;
    this.requestId = init.requestId ?? '';
    this.issues = init.issues;
  }
}

type ErrorBody = {
  error?: unknown;
  code?: unknown;
  requestId?: unknown;
  issues?: unknown;
};

const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

function readIssues(raw: unknown): ApiIssue[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const issues = raw.flatMap((i): ApiIssue[] => {
    const message = str((i as ApiIssue | null)?.message);
    return message ? [{ path: str((i as ApiIssue).path) ?? '', message }] : [];
  });
  return issues.length > 0 ? issues : undefined;
}

/** Turns a failed response into an `ApiError`; bodies that are not JSON (proxy pages) still yield one. */
export async function parseApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    // A proxy or crash page is not JSON; the status line and request-id header still identify the failure.
  }
  const issues = res.status === 422 ? readIssues(body?.issues) : undefined;
  return new ApiError({
    message: str(body?.error),
    status: res.status,
    code: str(body?.code),
    requestId: str(body?.requestId) ?? res.headers.get(REQUEST_ID_HEADER) ?? undefined,
    issues,
  });
}

/** Sends the browser to the login page; a no-op during SSR and when already on `/login` (no loop). */
export function redirectToSession(): void {
  // Guarded: this module is also bundled for the server, where `window` does not exist.
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith(LOGIN_PATH_PREFIX)) return;
  window.location.assign(SESSION_EXPIRED_PATH);
}

export type RequestOptions = RequestInit & {
  /** Replaces the default redirect to the login page, e.g. in tests. */
  onUnauthorized?: () => void;
};

/** `fetch` that returns parsed JSON and throws `ApiError` on any non-2xx; 401 also leaves for the login page. */
export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { onUnauthorized = redirectToSession, ...init } = options;
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) {
    const error = await parseApiError(res);
    if (error.status === 401) onUnauthorized();
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Builds the `RequestInit` for a JSON body; `body` left undefined sends none. */
export function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'Sesi kamu sudah berakhir. Masuk lagi untuk melanjutkan.',
  403: 'Kamu tidak punya izin untuk melakukan ini. Hubungi pengelola proyek bila perlu.',
  404: 'Data tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.',
  409: 'Data sudah berubah oleh orang lain. Muat ulang halaman, lalu coba lagi.',
  429: 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.',
};
const NETWORK_MESSAGE = 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.';
const GENERIC_MESSAGE = 'Terjadi kesalahan. Coba lagi.';
const SERVER_MESSAGE = 'Terjadi kesalahan di server. Coba lagi';

/** One actionable Indonesian sentence for any failure; never exposes stack traces or raw status codes. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const { status, requestId, issues } = err;
    if (status >= 500) {
      return requestId
        ? `${SERVER_MESSAGE}; sebutkan kode ${requestId} bila melapor.`
        : `${SERVER_MESSAGE}.`;
    }
    // 401 and 429 always get the fixed text: the server wording is generic there.
    if (status === 401 || status === 429) return FALLBACK_MESSAGES[status];
    if (status === 422 && issues?.[0]) return `Periksa isian: ${issues[0].message}`;
    // Other 4xx messages are written for the user by the handlers (server convention).
    if (err.hasServerMessage) return err.message;
    return FALLBACK_MESSAGES[status] ?? GENERIC_MESSAGE;
  }
  // `fetch` rejects with TypeError when the network is down or the request is blocked.
  if (err instanceof TypeError) return NETWORK_MESSAGE;
  return GENERIC_MESSAGE;
}
