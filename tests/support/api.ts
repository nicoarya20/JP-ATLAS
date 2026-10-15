/** API helpers (S0B-21): call the full production router in-process and assert its uniform error shape. */
import { expect } from 'bun:test';
import { and, type SQL } from 'drizzle-orm';
import { api } from '../../server/api';
import { db } from '../../server/db';
import { auditLog } from '../../server/db/schema';

// biome-ignore lint/suspicious/noExplicitAny: response bodies are asserted field by field by each caller
export type Json = Record<string, any>;
export type ApiResult = { status: number; body: Json; headers: Headers };
export type AuditRow = typeof auditLog.$inferSelect;

const API_PREFIX = '/api';
const BASE_URL = 'http://localhost';
const AUDIT_POLL_MS = 10;
const AUDIT_TIMEOUT_MS = 1_000;

/** Sends one request through `api.handle` (no socket, no `listen`); `path` may omit the `/api` prefix. */
export async function call(
  method: string,
  path: string,
  body?: unknown,
  headers: HeadersInit = {},
): Promise<ApiResult> {
  const url = path.startsWith(API_PREFIX) ? path : `${API_PREFIX}${path}`;
  const res = await api.handle(
    new Request(`${BASE_URL}${url}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as Json,
    headers: res.headers,
  };
}

/** Asserts a failed call carries the uniform `{ error, code, status, requestId }` body and the expected status/code. */
export function expectApiError(res: ApiResult, status: number, code: string): void {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({ code, status });
  expect(typeof res.body.error).toBe('string');
  expect(res.body.error.length).toBeGreaterThan(0);
  expect(typeof res.body.requestId).toBe('string');
  expect(res.body.requestId.length).toBeGreaterThan(0);
}

/**
 * Audit writes are fire-and-forget, so poll for rows matching `where` (at most 1 s, every 10 ms)
 * instead of a fixed sleep. Returns `[]` on timeout so a test can also assert that nothing was written.
 */
export async function waitForAudit(...where: SQL[]): Promise<AuditRow[]> {
  // performance.now, not Date.now: `freezeAt` stops the Date clock and the loop would never end.
  const deadline = performance.now() + AUDIT_TIMEOUT_MS;
  for (;;) {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(...where));
    if (rows.length > 0 || performance.now() >= deadline) return rows;
    await Bun.sleep(AUDIT_POLL_MS);
  }
}
