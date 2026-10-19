/** Client for `GET /api/app/team` through Eden: one page per call, paged with `offset` and `total`. */
import type { PmCode } from '@server/pm/errors';
import type { ListTeamOk, TeamPerson } from '@server/team/team.dto';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { TEAM_ERROR_MESSAGES } from '../components/team/team.copy';
import { client } from './eden';
import { ApiError, describeApiError } from './http';
import { unwrap } from './projects-api';
import type { TeamListQuery } from './team-filters';

export type { TeamPerson };
export type TeamPage = ListTeamOk;

/** React-query keys; the whole query is in the key, so every filter has its own cache entry. */
export const teamKeys = {
  all: ['team'] as const,
  list: (q: TeamListQuery) => ['team', 'list', q] as const,
};

/** Where a person's detail page lives (`/app/team/:userId`). */
export const teamPersonHref = (id: string) => `/app/team/${encodeURIComponent(id)}`;

/** One Indonesian sentence for a failed team call; known codes get the team wording. */
export function teamErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const message = TEAM_ERROR_MESSAGES[err.code as PmCode];
    if (message) return message;
  }
  return describeApiError(err);
}

export async function fetchTeam(query: TeamListQuery, offset: number): Promise<TeamPage> {
  return unwrap(await client.api.app.team.get({ query: { ...query, offset } }));
}

/** What the route loader hands over: the first page for exactly this query, if the server answered. */
export type TeamSeed = { query: TeamListQuery; first: TeamPage | null; loadedAt: number };

const loadedCount = (pages: TeamPage[]) => pages.reduce((n, p) => n + p.people.length, 0);

/** Loaded pages joined; a person who moved between pages while paging appears once. */
export function uniquePeople(pages: TeamPage[]): TeamPerson[] {
  const byId = new Map<string, TeamPerson>();
  for (const person of pages.flatMap((p) => p.people)) {
    if (!byId.has(person.id)) byId.set(person.id, person);
  }
  return [...byId.values()];
}

export function useTeamPages(query: TeamListQuery, seed: TeamSeed) {
  // The SSR page only seeds the cache for the exact query the loader ran.
  const seeded = seed.first !== null && JSON.stringify(query) === JSON.stringify(seed.query);
  return useInfiniteQuery({
    queryKey: teamKeys.list(query),
    queryFn: ({ pageParam }) => fetchTeam(query, pageParam),
    initialPageParam: 0,
    // The next offset is what was received, not what is shown, so a duplicate never skips a person.
    getNextPageParam: (last, all) => (loadedCount(all) < last.total ? loadedCount(all) : undefined),
    initialData: seeded && seed.first ? { pages: [seed.first], pageParams: [0] } : undefined,
    initialDataUpdatedAt: seed.loadedAt,
    placeholderData: keepPreviousData,
  });
}
