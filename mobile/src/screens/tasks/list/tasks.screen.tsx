// The Tasks tab (prototype tasks.list.jsx ListScreen, tasks.board.jsx TasksBoard), read from /api/app/tasks: the
// stacked header with the search and the Filter & sort icon, the My tasks / All tasks and List / Kanban switches pinned
// under it (route params `scope` and `view`), then the list or the board (tasks-body.tsx). Switching My / All starts the
// other list from its own default query; List / Kanban keeps it. Typing searches once the text rests (SEARCH_WAIT_MS),
// so a word is one request, not one per letter.
import { router, useLocalSearchParams } from 'expo-router';
import { List, SquareKanban } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { HStack } from '@/components/ui/hstack';
import { resetQuery, useQuery } from '@/data/tasks.query-state';

import { TasksSearchField } from '../filter/tasks-search';
import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { ServerBoard, ServerList } from './tasks-body';

const SCOPES = ['mine', 'all'] as const;
const VIEWS = ['list', 'board'] as const;
/** How long typing must pause before the search is sent. */
export const SEARCH_WAIT_MS = 300;

/** `value`, once it has stayed the same for `ms`. */
function useSettled(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** The Tasks tab of whoever is signed in. */
export function TasksScreen() {
  const params = useLocalSearchParams<{ scope?: string; view?: string }>();
  const scope = params.scope === 'all' ? 'all' : 'mine';
  const view = params.view === 'board' ? 'board' : 'list';
  const [search, setSearch] = useState('');
  const sent = useSettled(search, SEARCH_WAIT_MS);
  const query = useQuery(scope);
  const reset = () => {
    resetQuery(scope);
    setSearch('');
  };
  const pickScope = (i: number) => {
    if (SCOPES[i] === scope) return;
    resetQuery(SCOPES[i]);
    router.setParams({ scope: SCOPES[i] });
  };
  const Body = view === 'board' ? ServerBoard : ServerList;
  return (
    <StackedScreen
      testID="screen-tasks"
      title={S.title}
      find={<TasksSearchField scope={scope} value={search} onChangeText={setSearch} />}
      pinned={
        <HStack className="items-center gap-2">
          <View className="min-w-0 flex-1">
            <Seg
              testID="tasks-scope"
              label={SPOKEN.scope}
              items={S.scopes}
              value={SCOPES.indexOf(scope)}
              onChange={pickScope}
            />
          </View>
          <View className="w-20">
            <Seg
              testID="tasks-view"
              label={SPOKEN.view}
              items={S.views}
              icons={[List, SquareKanban]}
              value={VIEWS.indexOf(view)}
              onChange={(i) => router.setParams({ view: VIEWS[i] })}
            />
          </View>
        </HStack>
      }
    >
      <Body scope={scope} query={query} search={sent} onReset={reset} />
    </StackedScreen>
  );
}
