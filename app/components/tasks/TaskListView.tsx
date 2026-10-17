/**
 * The task list shared by the Tugas page (S2-10) and the Tugas tab of a project (S2-14). "Tugas saya"
 * with open tasks shows schedule groups; every other view is a table of at most five columns from
 * `sm` up (K15) and cards below it. `lockedProjectId` pins the list to one project.
 */
import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';
import {
  type TaskCounts,
  type TaskPage,
  taskErrorMessage,
  useTaskCounts,
  useTaskList,
} from '~/lib/tasks-api';
import {
  hasTaskFilters,
  isGroupedView,
  type TaskFilters,
  type TaskListQuery,
  toTaskQuery,
} from '~/lib/tasks-filters';
import { TaskEmpty, type TaskEmptyVariant } from './TaskEmpty';
import { TaskGroupList } from './TaskGroupList';
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

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert color="danger" title={LIST_COPY.loadFailed}>
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{taskErrorMessage(error)}</Text>
        <Button variant="light" onClick={onRetry}>
          {LIST_COPY.retry}
        </Button>
      </Stack>
    </Alert>
  );
}

const Loading = () => (
  <Center py="xl">
    <Loader />
  </Center>
);

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
      return <LoadError error={counts.error} onRetry={() => void counts.refetch()} />;
    if (!counts.data) return <Loading />;
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
    return <LoadError error={list.error} onRetry={() => void list.refetch()} />;
  }
  if (!list.data) return <Loading />;
  return (
    <TaskTable
      rows={list.data.pages.flatMap((p) => p.items)}
      empty={empty}
      hasMore={list.hasNextPage}
      loadingMore={list.isFetchingNextPage}
      onMore={() => void list.fetchNextPage()}
    />
  );
}
