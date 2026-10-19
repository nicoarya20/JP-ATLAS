/** Client for `GET /api/app/team/:userId` (S6 layar ②): one person's profile, shared projects and open work. */
import type { GetPersonOk } from '@server/team/team.dto';
import { useQuery } from '@tanstack/react-query';
import { NOT_FOUND_TEXT } from '../components/team/team.detail.copy';
import { client } from './eden';
import { ApiError, describeApiError, redirectToSession } from './http';

/** The response body; `accountRole` is sent only to an Admin or Super-admin, for anyone else the key is absent. */
export type PersonDetail = GetPersonOk;

/** React-query keys; one entry per person. */
export const teamPersonKeys = {
  detail: (userId: string) => ['team', 'person', userId] as const,
};

/** One Indonesian sentence for a failed call; a 404 reads as a person, not a project or task. */
export function personErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'NOT_FOUND') return NOT_FOUND_TEXT;
  return describeApiError(err);
}

type ErrorValue = { error?: unknown; code?: unknown; requestId?: unknown };

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

/** Eden ids are pasted into the path as they are, so the id is escaped here. */
export async function fetchPerson(userId: string): Promise<PersonDetail> {
  const res = await client.api.app.team({ userId: encodeURIComponent(userId) }).get();
  if (!res.error) return res.data as PersonDetail;
  // Typed as number: the route's own error union leaves out the 401 that the session gate adds.
  const status: number = typeof res.error.status === 'number' ? res.error.status : 500;
  if (status === 401) redirectToSession();
  const v = (res.error.value ?? {}) as ErrorValue;
  throw new ApiError({
    message: text(v.error),
    status,
    code: text(v.code),
    requestId: text(v.requestId) ?? res.response?.headers.get('x-request-id') ?? undefined,
  });
}

/** The loader's person as `initialData`; a refetch (retry button, window return) keeps it fresh. */
export function usePerson(
  userId: string,
  opts: { initialData: PersonDetail; initialDataUpdatedAt: number },
) {
  return useQuery({
    queryKey: teamPersonKeys.detail(userId),
    queryFn: () => fetchPerson(userId),
    initialData: opts.initialData,
    initialDataUpdatedAt: opts.initialDataUpdatedAt,
  });
}
