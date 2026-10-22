/** One call that refreshes everything a project write can change: cached lists/history and the loader-fed header. */
import { useQueryClient } from '@tanstack/react-query';
import { useRevalidator } from 'react-router';
import { projectKeys } from '~/lib/projects-api';

export function useRefreshProject(): () => Promise<void> {
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      revalidator.revalidate(),
    ]);
  };
}
