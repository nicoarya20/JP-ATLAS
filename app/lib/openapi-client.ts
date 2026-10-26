/**
 * Loads the OpenAPI spec for an API key the operator typed into /dev/openapi.
 *
 * Security contract — the reason this is its own module (CLAUDE.md §7, §12):
 *  - The key travels only in the `X-API-Key` request header. Never in the URL
 *    and never in a query string, so it cannot land in an access log or a
 *    Referer header.
 *  - Nothing here writes to localStorage, sessionStorage, cookies or IndexedDB,
 *    and nothing here logs. The key lives in React state and dies with the tab.
 *  - `credentials: 'omit'` keeps the super-admin's session cookie off the
 *    request. That matters: the gate on GET /api/openapi.json is the API key,
 *    and the spec it returns is filtered down to what that key may call
 *    (specForKey). Sending the cookie too would blur the line between "what
 *    this key sees" and "who is looking", and the whole point of the page is to
 *    show the former. There is deliberately no session-authenticated path that
 *    returns an unfiltered spec.
 */
import type { OpenApiSpec } from './openapi-types';

/**
 * Same-origin path of the spec endpoint. Mirrors OPENAPI_PATH in
 * server/api/openapi.ts; `tests/dev-openapi.test.ts` asserts the two match.
 * It is not imported from there because that module reaches `server/env`,
 * which must not be pulled into the browser bundle.
 */
export const OPENAPI_ENDPOINT = '/api/openapi.json';

/** Prefix every key issued by this app carries (server/auth.ts API_KEY_PREFIX). */
export const API_KEY_PREFIX = 'sp_live_';

export class SpecFetchError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SpecFetchError';
    this.code = code;
  }
}

/** Messages are what the operator reads on the page, so they say what to do next. */
function messageFor(status: number, code: string | undefined): [string, string] {
  if (status === 401)
    return [
      'API key ditolak: tidak valid, kedaluwarsa, atau dinonaktifkan. Periksa kuncinya di /dev/api-keys.',
      code ?? 'UNAUTHORIZED',
    ];
  if (status === 403)
    return [
      'API key ini tidak diizinkan membaca spec. Pastikan kuncinya masih aktif dan IP kamu ada di allow-list-nya.',
      code ?? 'FORBIDDEN',
    ];
  if (status === 429)
    return [
      'API key melampaui batas request. Tunggu sebentar lalu coba lagi.',
      code ?? 'RATE_LIMITED',
    ];
  return [`Gagal memuat spec (HTTP ${status}). Coba lagi.`, code ?? 'SPEC_FETCH_FAILED'];
}

/**
 * Fetches the spec this key is allowed to see. Rejects with a SpecFetchError
 * carrying a message meant for the page; the key itself is never part of it.
 */
export async function fetchSpec(apiKey: string, signal?: AbortSignal): Promise<OpenApiSpec> {
  const key = apiKey.trim();
  // Refused here rather than sent: an empty key would come back as a 401 that
  // says nothing useful, and the page must show no spec at all without a key.
  if (!key) throw new SpecFetchError('Masukkan API key dulu.', 'API_KEY_REQUIRED');

  const res = await fetch(OPENAPI_ENDPOINT, {
    method: 'GET',
    headers: { 'X-API-Key': key, accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });

  if (!res.ok) {
    const code = await res
      .json()
      .then((b: unknown) => (b as { code?: string })?.code)
      .catch(() => undefined);
    const [message, errorCode] = messageFor(res.status, code);
    throw new SpecFetchError(message, errorCode);
  }

  const spec = (await res.json().catch(() => null)) as OpenApiSpec | null;
  if (!spec?.paths)
    throw new SpecFetchError('Server mengirim spec yang tidak bisa dibaca.', 'SPEC_MALFORMED');
  return spec;
}
