/**
 * The call behind "Susun ✦" (`POST /api/app/tasks/draft`, A1) and what each answer means for the page.
 * The call saves nothing; a refusal never throws, it comes back as an `outcome` the page acts on.
 */
import type { TaskDraftResponse } from '@server/ai/task-draft.types';
import { useCallback, useState } from 'react';
import { client } from '~/lib/eden';
import { ApiError, describeApiError, redirectToSession } from '~/lib/http';

const HTTP_UNAUTHORIZED = 401;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;
const DEFAULT_RETRY_SECONDS = 5; // used only when the server sent no retry-after

export type DraftOutcome =
  | { kind: 'ok'; body: TaskDraftResponse }
  /** AI off or down, or the network failed: the user continues in the form with their text. */
  | { kind: 'fallback' }
  | { kind: 'rate'; seconds: number }
  /** Any other refusal; `message` is the server's own sentence (or a generic one). */
  | { kind: 'error'; message: string };

type ErrorValue = { error?: unknown; code?: unknown; retryAfterSeconds?: unknown };

const positiveInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const ISO_DATE_LENGTH = 10; // "YYYY-MM-DD"

/**
 * Eden turns any JSON string shaped like a date into a `Date` (`YYYY-MM-DD` too), but the contract
 * says `dueDate` is a string the form and the create call take as is. Put such values back to text.
 */
export function restoreDates<T>(value: T): T {
  if (value instanceof Date) {
    const iso = value.toISOString();
    // A date-only string parses to UTC midnight; anything else was a full timestamp.
    return (iso.endsWith('T00:00:00.000Z') ? iso.slice(0, ISO_DATE_LENGTH) : iso) as T;
  }
  if (Array.isArray(value)) return value.map(restoreDates) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restoreDates(v)])) as T;
  }
  return value;
}

/** Asks the server to draft tasks from `text` for `projectId`. */
export async function requestDraft(projectId: string, text: string): Promise<DraftOutcome> {
  let res: Awaited<ReturnType<typeof client.api.app.tasks.draft.post>>;
  try {
    res = await client.api.app.tasks.draft.post({ projectId, text });
  } catch {
    return { kind: 'fallback' }; // fetch itself rejected: offline or blocked
  }
  if (!res.error) return { kind: 'ok', body: restoreDates(res.data as TaskDraftResponse) };
  const status = typeof res.error.status === 'number' ? res.error.status : 0;
  const value = (res.error.value ?? {}) as ErrorValue;
  const hasServerBody = typeof value.code === 'string';
  // Eden reports a failed fetch as an error whose value is not our `{ error, code }` body.
  if (!hasServerBody && status !== HTTP_UNAUTHORIZED) return { kind: 'fallback' };
  if (status === HTTP_UNAVAILABLE || status === HTTP_BAD_GATEWAY) return { kind: 'fallback' };
  if (status === HTTP_RATE_LIMITED) {
    const seconds =
      positiveInt(res.response?.headers.get('retry-after')) ??
      positiveInt(value.retryAfterSeconds) ??
      DEFAULT_RETRY_SECONDS;
    return { kind: 'rate', seconds };
  }
  if (status === HTTP_UNAUTHORIZED) redirectToSession();
  const message = typeof value.error === 'string' && value.error.trim() ? value.error : null;
  return { kind: 'error', message: message ?? describeApiError(new ApiError({ status })) };
}

/** `compose` with the `loading` flag for the Susun button. */
export function useTaskDraft() {
  const [loading, setLoading] = useState(false);
  const compose = useCallback(async (projectId: string, text: string) => {
    setLoading(true);
    try {
      return await requestDraft(projectId, text);
    } finally {
      setLoading(false);
    }
  }, []);
  return { compose, loading };
}
