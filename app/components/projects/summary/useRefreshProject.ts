/** One call that refreshes everything a project write can change: cached lists/history and the loader-fed header. */
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useRevalidator } from 'react-router';
import { projectKeys } from '~/lib/projects-api';

/**
 * Both halves of a refresh, in parallel. The react-query half covers the cached lists and the
 * Tahapan/Ringkasan panels; `revalidate` covers the project header, which comes from the layout
 * loader. React Router does not re-run a parent loader on its own (PRJ-02), so skipping the second
 * half leaves the name, status, due date and condition on screen from before the write.
 */
export function refreshProject(
  queryClient: QueryClient,
  revalidate: () => Promise<void> | void,
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    revalidate(),
  ]).then(() => undefined);
}

export function useRefreshProject(): () => Promise<void> {
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  return () => refreshProject(queryClient, () => revalidator.revalidate());
}
