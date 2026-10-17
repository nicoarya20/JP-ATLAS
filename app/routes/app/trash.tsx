import { Alert, Stack } from '@mantine/core';
import { requireUser } from '@server/guard';
import { PAGE_LIMIT_DEFAULT } from '@server/pm/limits';
import { toPrincipal } from '@server/project/membership.query';
import { listTrashProjects } from '@server/project/project-trash.query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FiAlertCircle } from 'react-icons/fi';
import { TrashProjectList } from '~/components/trash/TrashProjectList';
import { TRASH_PAGE_COPY } from '~/components/trash/trash.copy';
import { useTrashActions } from '~/components/trash/useTrashActions';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import { projectErrorMessage } from '~/lib/projects-api';
import { fetchTrash, type TrashPage, trashKeys } from '~/lib/trash-api';
import type { Route } from './+types/trash';

export function meta() {
  return [{ title: 'Sampah — Simple PM' }];
}

const QUERY = { limit: PAGE_LIMIT_DEFAULT } as const;

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // Visibility and `can.restore` are the server's; the page only renders what it is given.
  const { items, total } = await listTrashProjects(toPrincipal(actor), {
    limit: QUERY.limit,
    offset: 0,
    now: new Date(),
  });
  return {
    first: toJson<TrashPage>({ items, total, page: 1, limit: QUERY.limit }),
    loadedAt: Date.now(),
  };
}

const loadedCount = (pages: TrashPage[]) => pages.reduce((n, p) => n + p.items.length, 0);

/** Trashed projects the caller may see, newest delete first, with "Pulihkan" where allowed. */
export default function TrashPageRoute({ loaderData }: Route.ComponentProps) {
  const pages = useInfiniteQuery({
    queryKey: trashKeys.list(QUERY),
    queryFn: ({ pageParam }) => fetchTrash({ ...QUERY, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (loadedCount(all) < last.total ? last.page + 1 : undefined),
    initialData: { pages: [loaderData.first], pageParams: [1] },
    initialDataUpdatedAt: loaderData.loadedAt,
  });
  const { restore } = useTrashActions();
  const list = pages.data?.pages ?? [];

  return (
    <PageContainer>
      <PageHeader title={TRASH_PAGE_COPY.title} description={TRASH_PAGE_COPY.description} />
      <Stack gap="lg">
        {pages.isError && (
          <Alert
            color="red"
            variant="light"
            title={TRASH_PAGE_COPY.loadFailed}
            icon={<FiAlertCircle size="1.25em" aria-hidden />}
          >
            {projectErrorMessage(pages.error)}
          </Alert>
        )}
        <TrashProjectList
          items={list.flatMap((p) => p.items)}
          total={list.at(-1)?.total ?? 0}
          hasMore={pages.hasNextPage}
          loadingMore={pages.isFetchingNextPage}
          onMore={() => void pages.fetchNextPage()}
          restoringId={restore.restoringId}
          onRestore={(item) => void restore.run({ id: item.id, name: item.name })}
        />
      </Stack>
    </PageContainer>
  );
}
