/**
 * In-process client for the S5a-03 routes. The router is not mounted in `server/api/app.ts` yet
 * (L5-08 does that), so tests mount it under the same prefix and error plugin the real API uses.
 */
import { Elysia } from 'elysia';
import { writeLimiter } from '../../server/api/app-context';
import { projectsApi } from '../../server/api/app-projects';
import { projectDeadlineApi } from '../../server/api/app-projects.deadline';
import { apiErrorPlugin } from '../../server/api-error';
import type { ApiResult } from './api';

const app = new Elysia({ prefix: '/api/app' })
  .use(apiErrorPlugin())
  .use(projectsApi)
  .use(projectDeadlineApi);

/** Clears the per-user write limiter so a long file never answers 429 to its own later tests. */
export const resetWriteLimit = () => writeLimiter.reset();

/** `path` is relative to `/api/app`, e.g. `/projects/p1/extensions`. */
export async function callApp(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await app.handle(
    new Request(`http://localhost/api/app${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as ApiResult['body'],
    headers: res.headers,
  };
}
