import { Alert, Stack, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import { PAGE_LIMIT_DEFAULT } from '@server/pm/limits';
import { toPrincipal } from '@server/project/membership.query';
import { listTrash, type TrashItem } from '@server/trash/trash.list.query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { useTaskRestore } from '~/components/tasks/useTaskDelete';
import { TrashProjectList } from '~/components/trash/TrashProjectList';
import { TrashTaskList } from '~/components/trash/TrashTaskList';
import { TRASH_COPY, TRASH_PAGE_COPY } from '~/components/trash/trash.copy';
import { useTrashActions } from '~/components/trash/useTrashActions';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import { projectErrorMessage } from '~/lib/projects-api';
import { taskErrorMessage } from '~/lib/tasks-api';
import { fetchTrash, type TrashKind, type TrashPage, trashKeys } from '~/lib/trash-api';
import type { Route } from './+types/trash';

export function meta() {
  return [{ title: 'Sampah — Simple PM' }];
}

const QUERY = { limit: PAGE_LIMIT_DEFAULT } as const;

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const p = toPrincipal(actor);
  const now = new Date();
  // Visibility and `can.restore` are the server's; the page only renders what it is given.
  const [projects, tasks] = await Promise.all([
    listTrash(p, { kind: 'project', limit: QUERY.limit, offset: 0, now }),
    listTrash(p, { kind: 'task', limit: QUERY.limit, offset: 0, now }),
  ]);
  return {
    projects: firstPage('project', projects),
    tasks: firstPage('task', tasks),
    loadedAt: Date.now(),
  };
}

type Listed = Awaited<ReturnType<typeof listTrash>>;

/** Page 1 of one kind as JSON; the `kind` filter already made the items homogeneous, the guard says so to the types. */
function firstPage<K extends TrashKind>(kind: K, listed: Listed) {
  const items = listed.items.filter((i): i is Extract<TrashItem, { kind: K }> => i.kind === kind);
  return toJson<TrashPage<K>>({ ...listed, items, page: 1, limit: QUERY.limit });
}

const loadedCount = (pages: TrashPage<TrashKind>[]) =>
  pages.reduce((n, p) => n + p.items.length, 0);

/** One kind of the Trash as an infinite query seeded by the loader (page 1 needs no round trip). */
function useTrashKind<K extends TrashKind>(kind: K, first: TrashPage<K>, loadedAt: number) {
  return useInfiniteQuery({
    queryKey: trashKeys.list(QUERY, kind),
    queryFn: ({ pageParam }) => fetchTrash(kind, { ...QUERY, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (loadedCount(all) < last.total ? last.page + 1 : undefined),
    initialData: { pages: [first], pageParams: [1] },
    initialDataUpdatedAt: loadedAt,
  });
}

/** Trashed projects and tasks the caller may see, newest delete first, with "Pulihkan" where allowed. */
export default function TrashPageRoute({ loaderData }: Route.ComponentProps) {
  const projects = useTrashKind('project', loaderData.projects, loaderData.loadedAt);
  const tasks = useTrashKind('task', loaderData.tasks, loaderData.loadedAt);
  const { restore } = useTrashActions();
  const restoreTask = useTaskRestore();
  const projectPages = projects.data?.pages ?? [];
  const taskPages = tasks.data?.pages ?? [];

  return (
    <PageContainer>
      <PageHeader title={TRASH_PAGE_COPY.title} description={TRASH_PAGE_COPY.description} />
      <Stack gap="xl">
        <Stack gap="md">
          <Title order={3}>{TRASH_COPY.projectsHeading}</Title>
          {projects.isError && (
            <Alert
              color="red"
              variant="light"
              title={TRASH_PAGE_COPY.loadFailed}
              icon={<FiAlertCircle size="1.25em" aria-hidden />}
            >
              {projectErrorMessage(projects.error)}
            </Alert>
          )}
          <TrashProjectList
            items={projectPages.flatMap((p) => p.items)}
            total={projectPages.at(-1)?.total ?? 0}
            hasMore={projects.hasNextPage}
            loadingMore={projects.isFetchingNextPage}
            onMore={() => void projects.fetchNextPage()}
            restoringId={restore.restoringId}
            onRestore={(item) => void restore.run({ id: item.id, name: item.name })}
            empty={
              <EmptyState
                icon={FiTrash2}
                title={TRASH_COPY.noProjects.title}
                description={TRASH_COPY.noProjects.description}
              />
            }
          />
        </Stack>
        <Stack gap="md">
          <Title order={3}>{TRASH_COPY.tasksHeading}</Title>
          {tasks.isError && (
            <Alert
              color="red"
              variant="light"
              title={TRASH_COPY.loadFailed}
              icon={<FiAlertCircle size="1.25em" aria-hidden />}
            >
              {taskErrorMessage(tasks.error)}
            </Alert>
          )}
          <TrashTaskList
            items={taskPages.flatMap((p) => p.items)}
            total={taskPages.at(-1)?.total ?? 0}
            hasMore={tasks.hasNextPage}
            loadingMore={tasks.isFetchingNextPage}
            onMore={() => void tasks.fetchNextPage()}
            restoringId={restoreTask.restoringId}
            onRestore={(item) => void restoreTask.run({ id: item.id, number: item.number })}
          />
        </Stack>
      </Stack>
    </PageContainer>
  );
}
