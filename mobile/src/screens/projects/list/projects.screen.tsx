// Projects ① list (prototype projects.list.jsx): the stacked Projects tab with the search and the Filter & sort icon,
// then the project cards from `GET /api/app/projects`. Status, the attention flag, the sort order and the search text
// are sent to the server; "Load more" asks for the next page. The query lives in the projects query store (K4).
//
// The people row is gone, and with it the route param `who` and the My projects chip: the list route has only
// `scope=mine|all`, so "whose projects" would have to be filtered in the client — which filters the page already
// loaded and calls it the list (GAP A-2). Which projects a Member may see is the server's answer too, so the old
// `projectsFor(role)` went with it. Both are listed in docs/phase2-gap-disembunyikan.md.
import { router } from 'expo-router';
import { FolderOpen } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import {
  ensureProjectsList,
  moreProjects,
  type ProjectsListOptions,
  reloadProjectsList,
  useProjectsList,
} from '@/data/projects';
import { BASE_QUERY } from '@/data/projects.query';
import { setProjectsQuery, useProjectsQuery } from '@/data/projects.store';
import { LIST } from '../projects.strings';
import { ADDED } from '../projects.strings.added';
import { ProjectCard } from './project-card';

/** The Projects tab. */
export function ProjectsScreen() {
  const query = useProjectsQuery();
  const [search, setSearch] = useState('');
  const options = useMemo<ProjectsListOptions>(() => ({ query, search }), [query, search]);
  const data = useProjectsList(options);
  // Idempotent by rule 1: `ensure()` fetches only what is not fresh, so every mount may ask.
  useEffect(() => {
    void ensureProjectsList(options);
  }, [options]);
  const reset = () => {
    setProjectsQuery(BASE_QUERY);
    setSearch('');
  };
  return (
    <StackedScreen
      testID="screen-projects"
      title={LIST.title}
      find={
        <SearchFilter
          testID="projects-filter"
          placeholder={LIST.search}
          value={search}
          onChangeText={setSearch}
          on={data.filtered}
          onPress={() => router.push('/projects/filter')}
        />
      }
    >
      {data.phase === 'failed' && data.cards.length === 0 ? (
        // The server's own sentence, shown as it came (K5). No `busy`: a retry puts the list back
        // into `loading`, which this branch no longer matches, so the loading state takes over.
        <FailedState
          testID="projects-failed"
          message={data.error?.message}
          onRetry={() => void reloadProjectsList(options)}
        />
      ) : data.cards.length === 0 && data.empty === null ? (
        <LoadingState testID="projects-loading" />
      ) : data.empty === 'noMatch' ? (
        <NoMatch title={LIST.noMatch} onReset={reset} />
      ) : data.empty === 'none' ? (
        <EmptyState testID="projects-empty" icon={FolderOpen} title={LIST.empty} />
      ) : (
        <>
          <HStack className="items-center justify-between gap-2">
            {/* The server's total, not the rows loaded so far: with paging those differ. */}
            <Text className="flex-1 text-subhead text-muted-foreground">{data.count}</Text>
          </HStack>
          {data.cards.map((c) => (
            <ProjectCard key={c.id} card={c} onOpen={(id) => router.push(`/projects/${id}`)} />
          ))}
          {data.hasMore && (
            <Button
              testID="projects-more"
              variant="outline"
              onPress={() => void moreProjects(options)}
            >
              <ButtonText>{ADDED.more}</ButtonText>
            </Button>
          )}
        </>
      )}
    </StackedScreen>
  );
}
