import { Skeleton, Stack } from '@mantine/core';
import { canSortByLoad as mayViewOthersWork } from '@server/access/team.policy';
import { db } from '@server/db';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { isRefused } from '@server/team/team.dto';
import { listTeam } from '@server/team/team.query';
import { teamContext } from '@server/team/team.sql';
import { useEffect } from 'react';
import { TeamEmpty } from '~/components/team/TeamEmpty';
import { TeamFilters } from '~/components/team/TeamFilters';
import { TeamLoadError } from '~/components/team/TeamLoadError';
import { TeamResults, workOf } from '~/components/team/TeamResults';
import { TEAM_COPY } from '~/components/team/team.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import {
  type TeamPage as TeamPageData,
  type TeamSeed,
  teamErrorMessage,
  uniquePeople,
  useTeamPages,
} from '~/lib/team-api';
import {
  allowSort,
  clearTeamFiltersHref,
  dropSortPatch,
  hasTeamFilters,
  parseTeamFilters,
  toTeamQuery,
} from '~/lib/team-filters';
import { useUrlFilters } from '~/lib/use-url-filters';
import type { Route } from './+types/team';

/** The project picker lists at most this many projects, as on the task list. */
const PROJECT_OPTION_LIMIT = 100;

export function meta() {
  return [{ title: 'Tim — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const [ctx, projects] = await Promise.all([
    teamContext(principal, undefined, db),
    listProjects(principal, {
      scope: 'all',
      sort: 'name',
      limit: PROJECT_OPTION_LIMIT,
      offset: 0,
      now,
    }),
  ]);
  // The right to sort by someone else's numbers comes from the policy, not from a page's sums:
  // a Member's own load is always in the answer, so `summary.active` alone cannot tell.
  const canSortByLoad = mayViewOthersWork(principal, ctx.myRoles);
  const query = toTeamQuery(
    allowSort(parseTeamFilters(new URL(request.url).searchParams), canSortByLoad),
  );
  const first = await listTeam(principal, { ...query, offset: 0 }, now);
  const seed: TeamSeed = {
    query,
    // A refusal (such as a project that is gone) is left to the client fetch, which words it.
    first: isRefused(first) ? null : toJson<TeamPageData>(first),
    loadedAt: Date.now(),
  };
  return {
    seed,
    canSortByLoad,
    projects: projects.items.map((p) => ({ value: p.id, label: p.name })),
  };
}

/** Filters only change the query string; react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
  const { seed, canSortByLoad, projects } = loaderData;
  const { filters: urlFilters, setFilters } = useUrlFilters(parseTeamFilters);
  const filters = allowSort(urlFilters, canSortByLoad);
  const staleSort = filters.urut !== urlFilters.urut;
  // A link with `urut=aktif` for someone who may not use it is cleaned out of the address.
  useEffect(() => {
    if (staleSort) setFilters(dropSortPatch());
  }, [staleSort, setFilters]);

  const pages = useTeamPages(toTeamQuery(filters), seed);
  const list = pages.data?.pages ?? [];
  const people = uniquePeople(list);
  const last = list.at(-1);

  return (
    <PageContainer>
      <PageHeader title={TEAM_COPY.title} description={TEAM_COPY.description} />
      <Stack gap="lg">
        <TeamFilters
          filters={filters}
          projects={projects}
          canSortByLoad={canSortByLoad}
          onChange={setFilters}
        />
        {pages.isError && (
          <TeamLoadError
            message={teamErrorMessage(pages.error)}
            retrying={pages.isFetching}
            onRetry={() => void pages.refetch()}
          />
        )}
        {pages.isPending && <Skeleton height={72} radius="md" aria-label={TEAM_COPY.loading} />}
        {last && (
          <TeamResults
            people={people}
            total={last.total}
            scopeName={projects.find((p) => p.value === filters.proyek)?.label}
            work={workOf(people, canSortByLoad, last.summary.active !== undefined)}
            hasMore={pages.hasNextPage}
            loadingMore={pages.isFetchingNextPage}
            onMore={() => void pages.fetchNextPage()}
            stale={pages.isPlaceholderData}
            empty={
              <TeamEmpty
                filtered={hasTeamFilters(filters)}
                clearTo={clearTeamFiltersHref(filters)}
              />
            }
          />
        )}
      </Stack>
    </PageContainer>
  );
}
