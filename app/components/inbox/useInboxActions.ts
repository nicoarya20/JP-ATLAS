/** The writes of the Inbox page: open a card (marks it read) and "Tandai semua dibaca". */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { type InboxItem, inboxKeys, markAllInboxRead, markInboxRead } from '~/lib/inbox-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { INBOX_COPY } from './inbox.copy';

/**
 * A card's link was used: marks it read without making the navigation wait. `refresh` runs on
 * failure too, so a dot that could not be cleared is shown as it really is.
 */
export function markCardRead(item: InboxItem, refresh: () => unknown): void {
  if (item.read) return;
  void markInboxRead(item.id).then(refresh, refresh);
}

export function useInboxActions() {
  const client = useQueryClient();
  // Lists and the bell share one key prefix, so one call keeps dots, tab numbers and badge in step.
  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: inboxKeys.all }),
    [client],
  );

  const markAll = useApiMutation({
    mutationFn: markAllInboxRead,
    successMessage: INBOX_COPY.markAllDone,
    errorTitle: INBOX_COPY.markAllFailed,
    onSuccess: refresh,
  });

  return {
    refresh,
    markingAll: markAll.loading,
    markAllRead: () => void markAll.run(undefined),
    openCard: (item: InboxItem) => markCardRead(item, refresh),
  };
}
