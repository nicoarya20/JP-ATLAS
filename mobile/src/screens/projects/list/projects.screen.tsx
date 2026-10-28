// Projects ① list (prototype projects.list.jsx) from `GET /api/app/projects`: the stacked Projects tab with the name
// search and the Filter & sort icon, then the project cards and "Load more". The server decides which projects the
// viewer sees (a Member only their own). New project is the tab bar "+".
import { router } from 'expo-router';
import { FolderOpen } from 'lucide-react-native';
import { useEffect } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { projectsResource } from '@/data/projects.api';
import { getProjectsList } from '@/data/projects.list';
import { BASE_QUERY } from '@/data/projects.query';

import { LIST } from '../projects.strings';
import { ProjectCard } from './project-card';
import { LoadMore, useProjectsSearch } from './projects.controls';

/** The Projects tab. */
export function ProjectsScreen() {
  const state = projectsResource.use();
  const { search, setSearch, ask, pending } = useProjectsSearch();
  useEffect(() => {
    void projectsResource.ensure();
  }, []);
  const data = getProjectsList();
  const reset = () => {
    setSearch('');
    void ask({ ...BASE_QUERY, sort: projectsResource.current()?.query.sort ?? BASE_QUERY.sort });
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
          on={!!data?.filtered}
          onPress={() => router.push('/projects/filter')}
        />
      }
    >
      {!data ? (
        state.phase === 'failed' ? (
          <FailedState
            testID="projects-failed"
            message={state.error?.message}
            onRetry={() => void projectsResource.reload()}
          />
        ) : (
          <LoadingState testID="projects-loading" />
        )
      ) : (
        <VStack className="gap-4">
          {pending && (
            <Text testID="projects-refreshing" className="text-footnote text-muted-foreground">
              {LIST.refreshing}
            </Text>
          )}
          {state.phase === 'failed' && state.error && (
            <Text testID="projects-error" className="text-subhead text-destructive">
              {state.error.message}
            </Text>
          )}
          {data.empty === 'noMatch' ? (
            <NoMatch title={LIST.noMatch} onReset={reset} />
          ) : data.empty === 'none' ? (
            <EmptyState testID="projects-empty" icon={FolderOpen} title={LIST.empty} />
          ) : (
            data.cards.map((c) => (
              <ProjectCard key={c.id} card={c} onOpen={(id) => router.push(`/projects/${id}`)} />
            ))
          )}
          {data.more && <LoadMore shown={data.cards.length} total={data.total} />}
        </VStack>
      )}
    </StackedScreen>
  );
}
