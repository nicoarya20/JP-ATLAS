import { Box, SegmentedControl } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { listTrash } from '@server/trash/trash.list.query';
import { TrashList } from '~/components/trash/TrashList';
import { TRASH_PAGE_COPY } from '~/components/trash/trash.copy';
import { TRASH_QUERY, useTrashPage } from '~/components/trash/useTrashPage';
import { useTrashRestore } from '~/components/trash/useTrashRestore';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { toJson } from '~/lib/loader-json';
import { projectErrorMessage } from '~/lib/projects-api';
import type { TrashPage, TrashTab } from '~/lib/trash-api';
import { tabOptions } from '~/lib/trash-view';
import type { Route } from './+types/trash';

export function meta() {
  return [{ title: 'Sampah — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // Visibility, `can.restore` and every date are the server's; the page only renders what it is given.
  const listed = await listTrash(toPrincipal(actor), {
    kind: 'all',
    limit: TRASH_QUERY.limit,
    offset: 0,
    now: new Date(),
  });
  return {
    first: toJson<TrashPage>({ ...listed, page: 1, limit: TRASH_QUERY.limit }),
    loadedAt: Date.now(),
  };
}

/** Trashed projects, tasks and events the caller may see in one list, newest delete first, with "Pulihkan" where allowed. */
export default function TrashPageRoute({ loaderData }: Route.ComponentProps) {
  const page = useTrashPage(loaderData);
  const { query } = page;
  const restore = useTrashRestore();

  return (
    <PageContainer>
      <PageHeader title={TRASH_PAGE_COPY.title} description={TRASH_PAGE_COPY.description} />
      {/* Mantine has no `overflow` style prop: the tabs scroll sideways on a narrow phone
          instead of squeezing four labels together (CLAUDE.md mobile §2). */}
      <Box style={{ overflowX: 'auto' }}>
        <SegmentedControl
          color="gray.7"
          autoContrast
          bd="1px solid var(--mantine-color-gray-7)"
          styles={{ label: { fontWeight: 700 } }}
          aria-label={TRASH_PAGE_COPY.tabsLabel}
          value={page.tab}
          onChange={(value) => page.selectTab(value as TrashTab)}
          data={tabOptions(page.counts)}
        />
      </Box>
      <TrashList
        tab={page.tab}
        items={page.items}
        total={page.total}
        loading={query.isPending}
        error={query.isError ? projectErrorMessage(query.error) : null}
        hasMore={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        onMore={() => void query.fetchNextPage()}
        restoringKey={restore.restoringKey}
        highlightKey={page.highlightKey}
        onRestore={(item) => void restore.run(item)}
        onViewProject={page.viewProject}
      />
    </PageContainer>
  );
}
