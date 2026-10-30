/**
 * The call behind "Ceritakan proyeknya" (`POST /api/app/projects/draft`), mirroring
 * `useTaskDraft.ts` exactly: it saves nothing, and a refusal never throws — it comes back as an
 * `outcome` the page acts on (fallback to the plain form, a rate limit, or a generic error).
 */
import type { ProjectDraftResponse } from '@server/ai/project-draft.types';
import { useCallback, useState } from 'react';
import { client } from '~/lib/eden';
import { ApiError, describeApiError, redirectToSession } from '~/lib/http';

const HTTP_UNAUTHORIZED = 401;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;
const DEFAULT_RETRY_SECONDS = 5; // used only when the server sent no retry-after

export type ProjectDraftOutcome =
  | { kind: 'ok'; body: ProjectDraftResponse }
  /** AI off or down, or the network failed: the user continues in the plain form. */
  | { kind: 'fallback' }
  | { kind: 'rate'; seconds: number }
  /** Any other refusal; `message` is the server's own sentence (or a generic one). */
  | { kind: 'error'; message: string };

type ErrorValue = { error?: unknown; code?: unknown; retryAfterSeconds?: unknown };

const positiveInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Asks the server to draft a project (name, dates, phases, tasks) from `text`. */
export async function requestProjectDraft(text: string): Promise<ProjectDraftOutcome> {
  let res: Awaited<ReturnType<typeof client.api.app.projects.draft.post>>;
  try {
    res = await client.api.app.projects.draft.post({ text });
  } catch {
    return { kind: 'fallback' }; // fetch itself rejected: offline or blocked
  }
  if (!res.error) return { kind: 'ok', body: res.data as ProjectDraftResponse };
  const status: number = typeof res.error.status === 'number' ? res.error.status : 0;
  const value = (res.error.value ?? {}) as ErrorValue;
  const hasServerBody = typeof value.code === 'string';
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

/** `compose` with the `loading` flag for the "Susun draf" button. */
export function useProjectDraft() {
  const [loading, setLoading] = useState(false);
  const compose = useCallback(async (text: string) => {
    setLoading(true);
    try {
      return await requestProjectDraft(text);
    } finally {
      setLoading(false);
    }
  }, []);
  return { compose, loading };
}
