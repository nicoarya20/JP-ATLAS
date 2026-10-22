/**
 * The task list shared by the Tugas page (S2-10) and the Tugas tab of a project (S2-14). "Tugas saya"
 * with open tasks shows schedule groups; every other view is a table of at most five columns from
 * `sm` up (K15) and cards below it. `lockedProjectId` pins the list to one project.
 */
import { Stack } from '@mantine/core';
import { type TaskCounts, type TaskPage, useTaskCounts, useTaskList } from '~/lib/tasks-api';
import {
  hasTaskFilters,
  isGroupedView,
  type TaskFilters,
  type TaskListQuery,
  toTaskQuery,
} from '~/lib/tasks-filters';
import { TaskEmpty, type TaskEmptyVariant } from './TaskEmpty';
import { TaskGroupList } from './TaskGroupList';
import { TaskListSkeleton } from './TaskListSkeleton';
import { TaskLoadError } from './TaskLoadError';
import { TaskTable } from './TaskTable';
import { LIST_COPY } from './tasks.copy';

/** What the route loader already read (SSR), so the first paint needs no fetch. */
export type TaskListSeed = {
  /** The query the loader ran; the seed only applies while the list shows that same query. */
  query: TaskListQuery;
  /** First page of the table view; null in the grouped view. */
  first: TaskPage | null;
  /** "Tugas saya" counts; null outside the grouped view. */
  counts: TaskCounts | null;
  loadedAt: number;
};

type Props = {
  filters: TaskFilters;
  /** The signed-in user, for `orang=saya`. */
  viewerId: string;
  /** Project tab: only this project's tasks, whatever the URL says. */
  lockedProjectId?: string;
  onResetFilters: () => void;
  /** Task form link when the server allows creating (`caps.createTask`); null hides the button. */
  createTo?: string | null;
  seed?: TaskListSeed;
};

export function TaskListView({
  filters,
  viewerId,
  lockedProjectId,
  onResetFilters,
  createTo,
  seed,
}: Props) {
  const scope = { lockedProjectId };
  const query = toTaskQuery(filters, { viewerId, lockedProjectId });
  const grouped = isGroupedView(filters, scope);
  const filtered = hasTaskFilters(filters, scope);
  const seeded = seed && JSON.stringify(seed.query) === JSON.stringify(query) ? seed : undefined;
  const counts = useTaskCounts({
    enabled: grouped,
    initialData: seeded?.counts ?? undefined,
    initialDataUpdatedAt: seeded?.loadedAt,
  });
  const list = useTaskList(query, {
    enabled: !grouped,
    initialData: seeded?.first ? { pages: [seeded.first], pageParams: [undefined] } : undefined,
    initialDataUpdatedAt: seeded?.loadedAt,
  });

  const variant: TaskEmptyVariant = lockedProjectId
    ? 'project'
    : filters.lingkup === 'saya'
      ? 'mine'
      : 'all';
  const empty = (
    <TaskEmpty
      variant={variant}
      filtered={filtered}
      onResetFilters={onResetFilters}
      createTo={createTo}
    />
  );

  if (grouped) {
    if (counts.isError)
      return <TaskLoadError error={counts.error} onRetry={() => void counts.refetch()} />;
    if (!counts.data) return <TaskListSkeleton />;
    return (
      <TaskGroupList
        key={JSON.stringify(query)}
        query={query}
        counts={counts.data.mine}
        filtered={filtered}
        empty={empty}
      />
    );
  }

  if (list.isError && !list.data) {
    return <TaskLoadError error={list.error} onRetry={() => void list.refetch()} />;
  }
  if (!list.data) return <TaskListSkeleton />;
  return (
    <Stack gap="sm">
      <TaskTable
        rows={list.data.pages.flatMap((p) => p.items)}
        empty={empty}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onMore={() => void list.fetchNextPage()}
      />
      {/* Rows already on screen stay; only the page that failed to arrive is reported. */}
      {list.isError && (
        <TaskLoadError
          title={list.isFetchNextPageError ? LIST_COPY.loadMoreFailed : LIST_COPY.loadFailed}
          error={list.error}
          retrying={list.isFetching}
          onRetry={() => void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch())}
        />
      )}
    </Stack>
  );
}
