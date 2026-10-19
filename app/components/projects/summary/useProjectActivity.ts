/** The activity feed of a project as an infinite query: the SSR page seeds it, "Muat lebih banyak" asks for the next. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { type ActivityPage, deadlineKeys, fetchActivity } from '~/lib/project-deadline-api';
import { ACTIVITY_PAGE_SIZE } from './activity';

export function useProjectActivity(projectId: string, first: ActivityPage) {
  return useInfiniteQuery({
    queryKey: deadlineKeys.activity(projectId),
    queryFn: ({ pageParam }) =>
      fetchActivity(projectId, { cursor: pageParam, limit: ACTIVITY_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: { pages: [first], pageParams: [null] },
  });
}
