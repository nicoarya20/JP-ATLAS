// The Team list's controls: search and sort sent to the server, and "Load more". Each reports a failure in the
// server's words.
import { useCallback, useEffect, useRef, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  getTeamQuery,
  loadMoreTeam,
  setTeamQuery,
  type TeamQuery,
  type TeamSort,
} from '@/data/team.api';

import { TEAM } from './team.strings';

/** How long typing pauses before the search goes to the server. */
const SEARCH_DEBOUNCE_MS = 300;

/** "Load more" while the server has more people; a failure is reported, the rows stay. */
export function LoadMore({ shown, total }: { shown: number; total: number }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreTeam();
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <>
      <Text className="text-footnote text-muted-foreground">{TEAM.shown(shown, total)}</Text>
      <Button
        testID="team-more"
        variant="outline"
        isDisabled={busy}
        accessibilityState={{ busy, disabled: busy }}
        onPress={press}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{TEAM.loadMore}</ButtonText>
      </Button>
    </>
  );
}

/** Search, sort and the server's failures; the list itself is read from the store. */
export function useTeamControls() {
  const notice = useNotice();
  const [search, setSearch] = useState(() => getTeamQuery().q);
  // A search or a sort is out: the rows on screen answer the previous one.
  const [pending, setPending] = useState(false);
  const first = useRef(true);
  const ask = useCallback(async (next: Partial<TeamQuery>) => {
    setPending(true);
    try {
      return await setTeamQuery(next);
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    // The box starts at the query on hand; only a change the person typed goes to the server.
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (search.trim() !== getTeamQuery().q.trim()) void ask({ q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, ask]);
  const sortBy = async (sort: TeamSort) => {
    const state = await ask({ sort });
    if (state.phase !== 'failed' || !state.error) return;
    notice(state.error.message);
    // The server refused the order (`SORT_NOT_ALLOWED`): back to the one every viewer may use.
    if (state.error.code === 'SORT_NOT_ALLOWED') void ask({ sort: 'name' });
  };
  return { search, setSearch, sortBy, pending };
}
