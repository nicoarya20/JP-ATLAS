/**
 * The API client's transport contract: where the base URL comes from, which headers go out,
 * and that every failure arrives as an ApiError instead of being swallowed.
 */
import {
  ApiError,
  apiBaseUrl,
  apiGet,
  apiJson,
  apiPost,
  apiRequest,
  apiUrl,
  CLIENT_CODES,
  isApiError,
  setAuthHeaders,
} from '@/api';

const BASE = 'http://192.168.1.10:3005';

type FetchArgs = [string, RequestInit];

let calls: FetchArgs[] = [];

/** Installs a fetch double; `handler` sees the url and init of each call. */
function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    return handler(url, init);
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

const headersOf = (index = 0) => calls[index][1].headers as Record<string, string>;

/** Stands in for a server that never answers: rejects only once the request is aborted. */
const neverAnswers = (_url: string, init: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    const fail = () => reject(new Error('Aborted'));
    // Real fetch rejects straight away for a signal that is already aborted.
    if (init.signal?.aborted) fail();
    else init.signal?.addEventListener('abort', fail);
  });

const originalFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  process.env.EXPO_PUBLIC_API_URL = BASE;
  setAuthHeaders(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

describe('base URL', () => {
  it('is read from EXPO_PUBLIC_API_URL', () => {
    expect(apiBaseUrl()).toBe(BASE);
    expect(apiUrl('/api/app/home')).toBe(`${BASE}/api/app/home`);
  });

  it('is re-read on every call, so a reload picks up a new value', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.0.2:3000';
    expect(apiBaseUrl()).toBe('http://10.0.0.2:3000');
  });

  it('drops a trailing slash so paths do not double up', () => {
    process.env.EXPO_PUBLIC_API_URL = `${BASE}/`;
    expect(apiUrl('/api/app/home')).toBe(`${BASE}/api/app/home`);
  });

  it('accepts a path without a leading slash', () => {
    expect(apiUrl('api/app/home')).toBe(`${BASE}/api/app/home`);
  });

  it.each([undefined, '', '   '])('fails loudly when the value is %p', async (value) => {
    if (value === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = value;

    expect(() => apiBaseUrl()).toThrow(ApiError);
    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err) && err.code).toBe(CLIENT_CODES.NO_BASE_URL);
    expect(isApiError(err) && err.message).toContain('EXPO_PUBLIC_API_URL');
  });
});

describe('headers', () => {
  it('always asks for JSON', async () => {
    mockFetch(async () => jsonResponse({ ok: true }));
    await apiGet('/api/app/home');
    expect(headersOf().accept).toBe('application/json');
    expect(headersOf()['content-type']).toBeUndefined();
  });

  it('sets content-type and a JSON body only when there is a body', async () => {
    mockFetch(async () => jsonResponse({ ok: true }));
    await apiPost('/api/app/tasks', { title: 'Write it' });
    expect(headersOf()['content-type']).toBe('application/json');
    expect(calls[0][1].body).toBe('{"title":"Write it"}');
    expect(calls[0][1].method).toBe('POST');
  });

  it('adds whatever the auth provider returns', async () => {
    mockFetch(async () => jsonResponse({ ok: true }));
    setAuthHeaders(async () => ({ cookie: 'better-auth.session_token=abc' }));
    await apiGet('/api/app/home');
    expect(headersOf().cookie).toBe('better-auth.session_token=abc');
  });

  it('lets a caller override a header for one request', async () => {
    mockFetch(async () => jsonResponse({ ok: true }));
    setAuthHeaders(() => ({ cookie: 'from-provider' }));
    await apiGet('/api/app/home', { headers: { cookie: 'from-caller' } });
    expect(headersOf().cookie).toBe('from-caller');
  });

  it('sends no auth header once the provider is cleared', async () => {
    mockFetch(async () => jsonResponse({ ok: true }));
    setAuthHeaders(() => ({ cookie: 'x' }));
    setAuthHeaders(null);
    await apiGet('/api/app/home');
    expect(headersOf().cookie).toBeUndefined();
  });
});

describe('server errors map to the uniform shape', () => {
  it('carries error, code, status and requestId through', async () => {
    mockFetch(async () =>
      jsonResponse(
        {
          error: 'Silakan masuk terlebih dahulu.',
          code: 'UNAUTHORIZED',
          status: 401,
          requestId: 'abc123def456',
        },
        { status: 401 },
      ),
    );

    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (!isApiError(err)) return;
    expect(err.message).toBe('Silakan masuk terlebih dahulu.');
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.status).toBe(401);
    expect(err.requestId).toBe('abc123def456');
    expect(err.isTransport).toBe(false);
  });

  it('keeps the field-level issues of a 422', async () => {
    mockFetch(async () =>
      jsonResponse(
        {
          error: 'Validasi gagal',
          code: 'VALIDATION',
          status: 422,
          requestId: 'r1',
          issues: [{ path: 'title', message: 'Wajib diisi' }, { path: 123 }],
        },
        { status: 422 },
      ),
    );

    const err = await apiPost('/api/app/tasks', {}).catch((e: unknown) => e);
    // The malformed issue is dropped rather than handed to a screen as a broken object.
    expect(isApiError(err) && err.issues).toEqual([{ path: 'title', message: 'Wajib diisi' }]);
  });

  it('falls back to the x-request-id header when the body omits it', async () => {
    mockFetch(
      async () =>
        new Response(JSON.stringify({ error: 'Nope', code: 'NOPE' }), {
          status: 500,
          headers: { 'content-type': 'application/json', 'x-request-id': 'hdr-1' },
        }),
    );
    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err) && err.requestId).toBe('hdr-1');
  });

  it('still produces a usable error for a response that ignores the contract', async () => {
    mockFetch(async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (!isApiError(err)) return;
    expect(err.status).toBe(502);
    expect(err.code).toBe('HTTP_502');
    expect(err.message).not.toBe('');
  });
});

describe('a failed network is never swallowed', () => {
  it('reports an unreachable server as NETWORK, keeping the cause', async () => {
    const cause = new TypeError('Network request failed');
    mockFetch(async () => {
      throw cause;
    });

    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    if (!isApiError(err)) return;
    expect(err.code).toBe(CLIENT_CODES.NETWORK);
    expect(err.status).toBe(0);
    expect(err.isTransport).toBe(true);
    expect(err.requestId).toBeNull();
    expect(err.cause).toBe(cause);
    expect(err.message).toContain('Cannot reach the server');
  });

  it('reports a server that never answers as TIMEOUT', async () => {
    mockFetch(neverAnswers);

    const err = await apiGet('/api/app/home', { timeoutMs: 20 }).catch((e: unknown) => e);
    expect(isApiError(err) && err.code).toBe(CLIENT_CODES.TIMEOUT);
    expect(isApiError(err) && err.message).toContain('too long');
  });

  it("tells a caller's own abort apart from a timeout", async () => {
    mockFetch(neverAnswers);

    const controller = new AbortController();
    const pending = apiGet('/api/app/home', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const err = await pending;
    expect(isApiError(err) && err.code).toBe(CLIENT_CODES.ABORTED);
  });

  it('reports a 200 whose body is not JSON as BAD_RESPONSE, keeping why it failed', async () => {
    mockFetch(async () => new Response('not json', { status: 200 }));
    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err) && err.code).toBe(CLIENT_CODES.BAD_RESPONSE);
    expect(isApiError(err) && err.status).toBe(200);
    // The parse error is carried, not swallowed, so a bug report can say what arrived.
    // `instanceof Error` is avoided on purpose: the body parser throws from another realm here,
    // which is also why ApiError assigns `cause` instead of trusting the engine's option.
    expect(String((err as ApiError).cause)).toContain('JSON');
  });

  it('carries the parse error of an error response that is not JSON either', async () => {
    mockFetch(async () => new Response('<html>502</html>', { status: 502 }));
    const err = await apiGet('/api/app/home').catch((e: unknown) => e);
    expect(isApiError(err) && err.code).toBe('HTTP_502');
    expect(String((err as ApiError).cause)).toContain('JSON');
  });
});

describe('successful requests', () => {
  it('returns the parsed body', async () => {
    mockFetch(async () => jsonResponse({ briefing: { ok: true } }));
    await expect(apiGet<{ briefing: { ok: boolean } }>('/api/app/home')).resolves.toEqual({
      briefing: { ok: true },
    });
  });

  it('returns undefined for a 204 instead of failing on an empty body', async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    await expect(apiJson('/api/app/tasks/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('hands the raw Response back from apiRequest', async () => {
    mockFetch(async () => jsonResponse({ ok: true }, { status: 201 }));
    const res = await apiRequest('/api/app/tasks', { method: 'POST', body: {} });
    expect(res.status).toBe(201);
  });
});
