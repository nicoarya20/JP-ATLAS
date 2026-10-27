// Projects ① list (prototype projects.list.jsx): the stacked Projects tab with the search and the Filter & sort icon,
// the people row (route param `who`, so Back from a project keeps the pick), then the project cards. A Member sees
// only the projects they are in. The query lives in the projects query store (K4); New project is the tab bar "+".
import { router, useLocalSearchParams } from 'expo-router';
import { FolderOpen } from 'lucide-react-native';
import { useState } from 'react';

import { SearchFilter } from '@/components/filter/filter-button';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { getProjectsList } from '@/data/projects';
import { BASE_QUERY } from '@/data/projects.query';
import { setProjectsQuery, useProjectsQuery, useProjectsState } from '@/data/projects.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { LIST } from '../projects.strings';
import { PeopleRow } from './people-row';
import { ProjectCard } from './project-card';

/** The Projects tab. role: who is signed in (K12). */
export function ProjectsScreen({ role = SESSION_ROLE }: { role?: Role }) {
  useProjectsState();
  const query = useProjectsQuery();
  const { who } = useLocalSearchParams<{ who?: string }>();
  const [search, setSearch] = useState('');
  const data = getProjectsList(role, { who, query, search });
  const pick = (w: string | undefined) => router.setParams({ who: w });
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
      <PeopleRow people={data.people} mine={data.mine} who={who} onPick={pick} />
      {data.whoLine && (
        <HStack className="items-center justify-between gap-2">
          <Text className="flex-1 text-subhead font-semibold">{data.whoLine}</Text>
          <Button variant="link" onPress={() => pick(undefined)}>
            <ButtonText>{LIST.clear}</ButtonText>
          </Button>
        </HStack>
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
    </StackedScreen>
  );
}
