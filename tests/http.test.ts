import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import {
  ApiError,
  apiRequest,
  describeApiError,
  jsonRequest,
  parseApiError,
  redirectToSession,
  SESSION_EXPIRED_PATH,
} from '../app/lib/http';

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const errBody = (status: number, extra: Record<string, unknown> = {}) => ({
  error: 'Tugas tidak ditemukan.',
  code: 'NOT_FOUND',
  status,
  requestId: 'req123456789',
  ...extra,
});

let restoreFetch: (() => void) | null = null;
function stubFetch(res: Response | Error) {
  const spy = spyOn(globalThis, 'fetch').mockImplementation((async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch);
  restoreFetch = () => spy.mockRestore();
  return spy;
}

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
  Reflect.deleteProperty(globalThis, 'window');
});

describe('parseApiError', () => {
  it('maps {error,code,status,requestId} onto an ApiError', async () => {
    const err = await parseApiError(jsonResponse(404, errBody(404)));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect<number>(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.requestId).toBe('req123456789');
    expect(err.message).toBe('Tugas tidak ditemukan.');
    expect(err.issues).toBeUndefined();
  });

  it('keeps the field issues of a 422', async () => {
    const issues = [
      { path: '/title', message: 'Judul wajib diisi' },
      { path: '/dueDate', message: 'Tanggal tidak valid' },
    ];
    const err = await parseApiError(
      jsonResponse(422, errBody(422, { error: 'Validasi gagal', code: 'VALIDATION', issues })),
    );
    expect<number>(err.status).toBe(422);
    expect(err.issues).toEqual(issues);
  });

  it('ignores issues on other statuses and drops malformed entries', async () => {
    const other = await parseApiError(
      jsonResponse(400, errBody(400, { issues: [{ message: 'x' }] })),
    );
    expect(other.issues).toBeUndefined();
    const dirty = await parseApiError(
      jsonResponse(
        422,
        errBody(422, { issues: [null, { path: 'a' }, { path: 'b', message: 'ok' }] }),
      ),
    );
    expect(dirty.issues).toEqual([{ path: 'b', message: 'ok' }]);
  });

  it('survives a non-JSON body and reads the request id from the header', async () => {
    const res = new Response('<html>Bad gateway</html>', {
      status: 502,
      headers: { 'x-request-id': 'hdr-id-0001' },
    });
    const err = await parseApiError(res);
    expect<number>(err.status).toBe(502);
    expect(err.code).toBe('UNKNOWN');
    expect(err.requestId).toBe('hdr-id-0001');
    expect(err.hasServerMessage).toBe(false);
  });
});

describe('apiRequest', () => {
  it('returns parsed JSON on success and 204 as undefined', async () => {
    stubFetch(jsonResponse(200, { id: 'p1' }));
    expect(await apiRequest<{ id: string }>('/api/app/projects')).toEqual({ id: 'p1' });
    restoreFetch?.();
    stubFetch(new Response(null, { status: 204 }));
    expect(await apiRequest('/api/app/x', jsonRequest('DELETE'))).toBeUndefined();
  });

  it('throws ApiError for a failure and does not call onUnauthorized', async () => {
    stubFetch(jsonResponse(403, errBody(403, { error: 'Kamu bukan anggota proyek ini.' })));
    const calls: number[] = [];
    const err = await apiRequest('/api/app/x', { onUnauthorized: () => calls.push(1) }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect<number>((err as ApiError).status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it('calls onUnauthorized once for a 401 and still throws', async () => {
    stubFetch(jsonResponse(401, errBody(401, { error: 'Belum masuk', code: 'UNAUTHORIZED' })));
    const calls: number[] = [];
    const err = await apiRequest('/api/app/x', { onUnauthorized: () => calls.push(1) }).catch(
      (e: unknown) => e,
    );
    expect<number>((err as ApiError).status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it('lets a network failure through as the original TypeError', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    const err = await apiRequest('/api/app/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TypeError);
  });

  it('sends a JSON body with a content type only when there is a body', () => {
    expect(jsonRequest('POST', { a: 1 })).toEqual({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });
    expect(jsonRequest('DELETE').body).toBeUndefined();
  });
});

describe('redirectToSession', () => {
  it('is a no-op on the server, where there is no window', () => {
    expect(typeof window).toBe('undefined');
    expect(() => redirectToSession()).not.toThrow();
  });

  it('sends the browser to /login?notice=session', () => {
    const assigned: string[] = [];
    Object.assign(globalThis, {
      window: { location: { pathname: '/app/projects', assign: (u: string) => assigned.push(u) } },
    });
    redirectToSession();
    expect(assigned).toEqual([SESSION_EXPIRED_PATH]);
    expect(SESSION_EXPIRED_PATH).toBe('/login?notice=session');
  });

  it('does not loop when the login page itself answers 401', () => {
    const assigned: string[] = [];
    Object.assign(globalThis, {
      window: { location: { pathname: '/login', assign: (u: string) => assigned.push(u) } },
    });
    redirectToSession();
    expect(assigned).toHaveLength(0);
  });
});

describe('describeApiError', () => {
  const api = (status: number, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
    new ApiError({ status, ...extra });

  it('shows the server message for a 4xx that carries one', () => {
    expect(describeApiError(api(409, { message: 'Tugas ini sudah selesai.' }))).toBe(
      'Tugas ini sudah selesai.',
    );
  });

  it('falls back to an actionable sentence when the body had no message', () => {
    expect(describeApiError(api(404))).toContain('muat ulang');
    expect(describeApiError(api(403))).toContain('izin');
  });

  it('points to the first field issue for a 422', () => {
    const err = api(422, {
      message: 'Validasi gagal',
      issues: [{ path: '/title', message: 'Judul wajib diisi' }],
    });
    expect(describeApiError(err)).toBe('Periksa isian: Judul wajib diisi');
  });

  it('hides server details on 5xx but keeps the request id for support', () => {
    const text = describeApiError(api(500, { message: 'secret stack', requestId: 'abc123' }));
    expect(text).toContain('abc123');
    expect(text).not.toContain('secret');
  });

  it('explains 401, 429 and a dead network in plain Indonesian', () => {
    expect(describeApiError(api(401, { message: 'Unauthorized' }))).toContain('Masuk lagi');
    expect(describeApiError(api(429))).toContain('Tunggu sebentar');
    expect(describeApiError(new TypeError('Failed to fetch'))).toContain('koneksi internet');
    expect(describeApiError('weird')).toBe('Terjadi kesalahan. Coba lagi.');
  });
});
