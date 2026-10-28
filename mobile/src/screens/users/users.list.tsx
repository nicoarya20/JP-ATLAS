// What both Users tabs share: the list read from `/api/admin/users`, a search sent to the server once typing pauses,
// "Load more", and the loading / failed states (a 403 shows the server's own sentence).
import { useEffect, useRef, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import type { ResourceState } from '@/data/resource';
import { type UsersListData, type UsersTab, usersListOf } from '@/data/users.admin.api';

import { USERS } from './users.strings';

/** How long typing pauses before the search goes to the server. */
const SEARCH_DEBOUNCE_MS = 300;

/** The tab's list and its search box. */
export function useUsersList(tab: UsersTab) {
  const list = usersListOf(tab);
  const state = list.resource.useSnapshot();
  const [search, setSearch] = useState(list.getSearch);
  const first = useRef(true);
  useEffect(() => {
    void list.resource.ensure();
  }, [list]);
  useEffect(() => {
    // The box starts at the search on hand; only a change the person typed goes to the server.
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (search.trim() !== list.getSearch().trim()) void list.setSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, list]);
  return { state, search, setSearch, list };
}

/** Nothing to show yet: loading, or why it failed with "Try again". Null once rows are in. */
export function ListState({ tab, state }: { tab: UsersTab; state: ResourceState<UsersListData> }) {
  if (state.data) return null;
  if (state.phase === 'failed')
    return (
      <FailedState
        testID={`users-${tab}-failed`}
        message={state.error?.message}
        onRetry={() => void usersListOf(tab).resource.reload()}
      />
    );
  return <LoadingState testID={`users-${tab}-loading`} />;
}

/** "Load more" while the server has more rows; a failure is reported, the rows stay. */
export function LoadMore({ tab, data }: { tab: UsersTab; data: UsersListData }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  if (data.users.length >= data.total) return null;
  const press = async () => {
    setBusy(true);
    const state = await usersListOf(tab).loadMore();
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <Button
      testID={`users-${tab}-more`}
      variant="outline"
      isDisabled={busy}
      accessibilityState={{ busy, disabled: busy }}
      onPress={press}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{USERS.loadMore}</ButtonText>
    </Button>
  );
}
