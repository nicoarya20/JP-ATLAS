// The Tasks tab (prototype tasks.list.jsx ListScreen, tasks.board.jsx TasksBoard): the stacked header with the search
// and the Filter & sort icon, the My tasks / All tasks and List / Kanban switches pinned under it (route params `scope`
// and `view`), then the list or the board. Switching My / All starts the other list from its own default query; List /
// Kanban keeps it. New task lives on the tab bar's "+". A board emptied by the filters or search says so with Reset, as
// the list does (UX §4; the prototype leaves its columns empty).
import { router, useLocalSearchParams } from 'expo-router';
import { List, SquareKanban } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { HStack } from '@/components/ui/hstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTasksList } from '@/data/tasks';
import {
  ensureTaskListView,
  moreTaskListGroup,
  reloadTaskListView,
  type TaskListOptions,
  useTaskRowsView,
} from '@/data/tasks.api.view';
import { resetQuery, useQuery } from '@/data/tasks.query-state';
import { useTasks } from '@/data/tasks.state';

import { TaskBoard } from '../board/task-board';
import { TasksSearchField } from '../filter/tasks-search';
import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
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
  // The board still reads the sample store: its move menu writes there, so swapping only what it
  // shows would make a move look like it did nothing. Listed in the Gelombang 1 handover.
  const board = getTasksList(role, { scope, view, query, search }, state);
  const options = useMemo<TaskListOptions>(
    () => ({ scope, view: 'list', query, search }),
    [scope, query, search],
  );
  const list = useTaskRowsView(options);
  // Idempotent by rule 1: `ensure()` fetches only what is not fresh, so every mount may ask.
  useEffect(() => {
    void ensureTaskListView(options);
  }, [options]);
  const reset = () => {
    resetQuery(scope);
    setSearch('');
  };
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
              label={SPOKEN.scope}
              items={S.scopes}
              value={SCOPES.indexOf(scope)}
              onChange={pickScope}
            />
          </View>
          <View className="w-24">
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
      {view === 'board' ? (
        board.empty === 'noMatch' && board.view === 'board' ? (
          <NoMatch title={S.noMatch.title} text={S.noMatch.text} onReset={reset} />
        ) : board.view === 'board' ? (
          <TaskBoard
            role={role}
            mine={scope === 'mine'}
            tasks={board.columns.flatMap((c) => c.cards)}
          />
        ) : null
      ) : list.phase === 'failed' && list.groups.length === 0 ? (
        // The server's own sentence, shown as it came (K5): not translated, and not replaced by a
        // guess of our own about what went wrong.
        // No `busy`: a retry puts the list back into `loading`, which this branch no longer
        // matches, so the loading state takes over rather than a button that says it is working.
        <FailedState
          testID="tasks-failed"
          message={list.error?.message}
          onRetry={() => void reloadTaskListView(options)}
        />
      ) : list.groups.length === 0 && list.empty === null ? (
        <LoadingState testID="tasks-loading" />
      ) : (
        <TaskList
          mine={scope === 'mine'}
          groups={list.groups}
          empty={list.empty}
          mayCreate={list.createTask !== 'hidden'}
          onOpen={(no) => router.push(`/tasks/${no}`)}
          onNew={() => router.push('/tasks/new')}
          onReset={reset}
          onMore={(key) => void moreTaskListGroup(options, key)}
        />
      )}
    </StackedScreen>
  );
}
