import { treaty } from '@elysiajs/eden';
import type { Api } from '@server/api';

/**
 * End-to-end typesafe API client (Eden Treaty). Because FE + BE share one
 * origin, we can use a relative base URL in the browser. On the server we
 * fall back to APP_URL so SSR loaders can call the API too.
 */
function baseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.APP_URL ?? 'http://localhost:3000';
}

/**
 * `parseDate: false` keeps every date exactly as the server sent it. Eden otherwise rewrites any
 * string that looks like a date — `YYYY-MM-DD` included — into a `Date` object, which silently
 * breaks every reader typed as `string` (PRJ-01/T-01: empty due dates, blank Gantt, broken history).
 * Our DTOs are `string`, so the client must not reshape them.
 */
export const client = treaty<Api>(baseUrl(), { parseDate: false });
