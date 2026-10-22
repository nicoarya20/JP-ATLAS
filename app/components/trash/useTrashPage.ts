/**
 * State of the Trash page: the tab, the list of that tab as an infinite query (page 1 of "Semua" is
 * seeded by the loader, so the first paint needs no round trip) and the jump from a blocked task or
 * event to its project on the "Proyek" tab.
 */
import { PAGE_LIMIT_DEFAULT } from '@server/pm/limits';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  fetchTrash,
  type TrashCounts,
  type TrashPage,
  type TrashTab,
  trashKeys,
} from '~/lib/trash-api';
import { itemKey, mergePages, tabCount } from '~/lib/trash-view';
import { trashCardId } from './TrashItemCard';

export const TRASH_QUERY = { limit: PAGE_LIMIT_DEFAULT } as const;

type Seed = { first: TrashPage; loadedAt: number };

export function useTrashPage({ first, loadedAt }: Seed) {
  const [tab, setTab] = useState<TrashTab>('all');
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: trashKeys.list(TRASH_QUERY, tab),
    queryFn: ({ pageParam }) => fetchTrash(tab, { ...TRASH_QUERY, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      all.reduce((n, p) => n + p.items.length, 0) < last.total ? last.page + 1 : undefined,
    initialData: tab === 'all' ? { pages: [first], pageParams: [1] } : undefined,
    initialDataUpdatedAt: loadedAt,
  });
  const pages = query.data?.pages ?? [];
  // Every page answers with the counts of all kinds; until this tab's first page arrives the loader's stand in.
  const counts: TrashCounts = pages.at(-1)?.counts ?? first.counts;
  const items = mergePages(pages);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `items.length` is the trigger: the project tab's cards render after the jump, and the target must exist before scrolling
  useEffect(() => {
    if (highlightKey)
      document.getElementById(trashCardId(highlightKey))?.scrollIntoView({ block: 'center' });
  }, [highlightKey, items.length]);

  return {
    tab,
    counts,
    items,
    total: pages.at(-1)?.total ?? tabCount(counts, tab),
    query,
    highlightKey,
    selectTab: (next: TrashTab) => {
      setHighlightKey(null);
      setTab(next);
    },
    /** "Lihat proyeknya": the project's own tab, with its card marked. */
    viewProject: (projectId: string) => {
      setTab('project');
      setHighlightKey(itemKey({ kind: 'project', id: projectId }));
    },
  };
}
