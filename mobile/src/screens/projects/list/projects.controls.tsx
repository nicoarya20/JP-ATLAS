// The Projects list's controls: the name search sent to the server after a pause, and "Load more". Each reports a
// failure in the server's words.
import { useCallback, useEffect, useRef, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getProjectsQuery, loadMoreProjects, setProjectsQuery } from '@/data/projects.api';
import type { ProjectsQuery } from '@/data/projects.query';

import { LIST } from '../projects.strings';

/** How long typing pauses before the search goes to the server. */
const SEARCH_DEBOUNCE_MS = 300;

/** "Load more" while the server has more projects; a failure is reported, the cards stay. */
export function LoadMore({ shown, total }: { shown: number; total: number }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreProjects();
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <>
      <Text className="text-footnote text-muted-foreground">{LIST.shown(shown, total)}</Text>
      <Button
        testID="projects-more"
        variant="outline"
        isDisabled={busy}
        accessibilityState={{ busy, disabled: busy }}
        onPress={press}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{LIST.loadMore}</ButtonText>
      </Button>
    </>
  );
}

/** The search box and the requests it makes; the list itself is read from the store. */
export function useProjectsSearch() {
  const [search, setSearch] = useState(() => getProjectsQuery().q);
  // A search is out: the cards on screen answer the previous one.
  const [pending, setPending] = useState(false);
  const first = useRef(true);
  const ask = useCallback(async (next: Partial<ProjectsQuery>) => {
    setPending(true);
    try {
      return await setProjectsQuery(next);
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
      if (search.trim() !== getProjectsQuery().q.trim()) void ask({ q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, ask]);
  return { search, setSearch, ask, pending };
}
