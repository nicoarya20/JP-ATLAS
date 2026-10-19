import { Alert, Button, Stack } from '@mantine/core';
import { canCreateProject, projectListScope } from '@server/access/project.policy';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router';
import { clearFiltersHref, emptyKind, ProjectEmpty } from '~/components/projects/ProjectEmpty';
import { ProjectFilters } from '~/components/projects/ProjectFilters';
import { ProjectResults } from '~/components/projects/ProjectResults';
import { LIST_COPY } from '~/components/projects/projects.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import {
  fetchProjects,
  type ProjectPage,
  projectErrorMessage,
  projectKeys,
} from '~/lib/projects-api';
import {
  type ProjectFilters as Filters,
  hasProjectFilters,
  type ProjectListQuery,
  parseProjectFilters,
  toProjectQuery,
} from '~/lib/projects-filters';
import { useUrlFilters } from '~/lib/use-url-filters';
import type { Route } from './+types/projects';

const NEW_PROJECT_PATH = '/app/projects/new';

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

/** Always from the first page: "Tampilkan lebih banyak" appends later pages instead of jumping to one. */
const firstPageQuery = (f: Filters): ProjectListQuery => toProjectQuery({ ...f, hal: 1 });

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const query = firstPageQuery(parseProjectFilters(new URL(request.url).searchParams));
  const { items, total } = await listProjects(principal, {
    scope: query.scope,
    status: query.status,
    q: query.q,
    sort: query.sort,
    limit: query.limit,
    offset: 0,
    now,
  });
  return {
    query,
    first: toJson<ProjectPage>({ items, total, page: 1, limit: query.limit }),
    // Both switches come from the server's policy, so the page never compares a role.
    canCreate: canCreateProject(principal).ok,
    canSeeAll: projectListScope(principal).kind === 'all',
    // "Today" is the server's, so "n hari lagi" matches the condition the server computed.
    today: isoDateIn(now, METRICS.TIME_ZONE),
    loadedAt: Date.now(),
  };
}

/** Filters only change the query string; react-query fetches, so the loader need not run again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

const loadedCount = (pages: ProjectPage[]) => pages.reduce((n, p) => n + p.items.length, 0);

function useProjectPages(query: ProjectListQuery, data: Route.ComponentProps['loaderData']) {
  // The SSR page only seeds the cache for the exact query the loader ran.
  const seeded = JSON.stringify(query) === JSON.stringify(data.query);
  return useInfiniteQuery({
    queryKey: projectKeys.list(query),
    queryFn: ({ pageParam }) => fetchProjects({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (loadedCount(all) < last.total ? last.page + 1 : undefined),
    initialData: seeded ? { pages: [data.first], pageParams: [1] } : undefined,
    initialDataUpdatedAt: data.loadedAt,
    placeholderData: keepPreviousData,
  });
}

export default function ProjectsPage({ loaderData }: Route.ComponentProps) {
  const { filters, setFilters } = useUrlFilters(parseProjectFilters);
  const query = firstPageQuery(filters);
  const pages = useProjectPages(query, loaderData);
  const list = pages.data?.pages ?? [];
  const items = list.flatMap((p) => p.items);
  const total = list.at(-1)?.total ?? 0;
  const create = loaderData.canCreate && (
    <Button
      component={Link}
      to={NEW_PROJECT_PATH}
      leftSection={<FiPlus size="1.25em" aria-hidden />}
    >
      {LIST_COPY.create}
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader title={LIST_COPY.title} description={LIST_COPY.description} actions={create} />
      <Stack gap="lg">
        <ProjectFilters filters={filters} canSeeAll={loaderData.canSeeAll} onChange={setFilters} />
        {pages.isError && (
          <Alert
            color="red"
            variant="light"
            title={LIST_COPY.loadFailed}
            icon={<FiAlertCircle size="1.25em" aria-hidden />}
          >
            {projectErrorMessage(pages.error)}
          </Alert>
        )}
        <ProjectResults
          view={filters.tampilan}
          items={items}
          total={total}
          today={loaderData.today}
          hasMore={pages.hasNextPage}
          loadingMore={pages.isFetchingNextPage}
          onMore={() => void pages.fetchNextPage()}
          empty={
            <ProjectEmpty
              kind={emptyKind(hasProjectFilters(filters), loaderData.canCreate)}
              createTo={NEW_PROJECT_PATH}
              clearTo={clearFiltersHref(filters)}
            />
          }
        />
      </Stack>
    </PageContainer>
  );
}
