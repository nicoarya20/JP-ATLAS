// The Tasks tab (prototype tasks.list.jsx ListScreen, tasks.board.jsx TasksBoard): the stacked header with the search
// and the Filter & sort icon, the My tasks / All tasks and List / Kanban switches pinned under it (route params `scope`
// and `view`), then the list or the board. Switching My / All starts the other list from its own default query; List /
// Kanban keeps it. New task lives on the tab bar's "+".
import { router, useLocalSearchParams } from 'expo-router';
import { List, SquareKanban } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { HStack } from '@/components/ui/hstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTasksList } from '@/data/tasks';
import { resetQuery, useQuery } from '@/data/tasks.query-state';
import { useTasks } from '@/data/tasks.state';

import { TaskBoard } from '../board/task-board';
import { TasksSearchField } from '../filter/tasks-search';
import { S } from '../tasks.strings';
import { TaskList } from './task-list';

const SCOPES = ['mine', 'all'] as const;
const VIEWS = ['list', 'board'] as const;

/** The Tasks tab for `role` (who is signed in). */
export function TasksScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const params = useLocalSearchParams<{ scope?: string; view?: string }>();
  const scope = params.scope === 'all' ? 'all' : 'mine';
  const view = params.view === 'board' ? 'board' : 'list';
  const [search, setSearch] = useState('');
  const query = useQuery(scope);
  const state = useTasks((s) => s);
  const data = getTasksList(role, { scope, view, query, search }, state);
  const pickScope = (i: number) => {
    if (SCOPES[i] === scope) return;
    resetQuery(SCOPES[i]);
    router.setParams({ scope: SCOPES[i] });
  };
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
              items={S.scopes}
              value={SCOPES.indexOf(scope)}
              onChange={pickScope}
            />
          </View>
          <View className="w-24">
            <Seg
              testID="tasks-view"
              items={S.views}
              icons={[List, SquareKanban]}
              value={VIEWS.indexOf(view)}
              onChange={(i) => router.setParams({ view: VIEWS[i] })}
            />
          </View>
        </HStack>
      }
    >
      {data.view === 'board' ? (
        <TaskBoard
          role={role}
          mine={scope === 'mine'}
          tasks={data.columns.flatMap((c) => c.cards)}
        />
      ) : (
        <TaskList
          mine={scope === 'mine'}
          groups={data.groups}
          empty={data.empty}
          onOpen={(no) => router.push(`/tasks/${no}`)}
          onNew={() => router.push('/tasks/new')}
          onReset={() => {
            resetQuery(scope);
            setSearch('');
          }}
        />
      )}
    </StackedScreen>
  );
}
