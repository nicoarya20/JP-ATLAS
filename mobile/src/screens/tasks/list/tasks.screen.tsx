// The Tasks tab (prototype tasks.list.jsx ListScreen, tasks.board.jsx TasksBoard): the stacked header with the search
// and the Filter & sort icon, the My tasks / All tasks and List / Kanban switches pinned under it (route params `scope`
// and `view`), then the list or the board. Both read /api/app/tasks — the board as one request per column, with its
// moves going to the server a step at a time (board/board-moves.server.ts). Switching My / All starts the other list from its own default query; List /
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
import {
  ensureTaskListView,
  moreTaskListGroup,
  reloadTaskListView,
  type TaskListOptions,
  useTaskBoardView,
  useTaskRowsView,
} from '@/data/tasks.api.view';
import { resetQuery, useQuery } from '@/data/tasks.query-state';

import { serverMoves } from '../board/board-moves.server';
import { TaskBoard } from '../board/task-board';
import { TasksSearchField } from '../filter/tasks-search';
import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { TaskList } from './task-list';

const SCOPES = ['mine', 'all'] as const;
const VIEWS = ['list', 'board'] as const;

/**
 * The Tasks tab.
 *
 * No `role` any more: both the list and the board read what the server allows this account —
 * `caps.createTask` for New task and each card's own `can{}` for its moves — so who is signed in is
 * not something this screen has to be told (the same step Beranda and Inbox took, §4.5 of
 * docs/phase2-gap-disembunyikan.md).
 */
export function TasksScreen() {
  const params = useLocalSearchParams<{ scope?: string; view?: string }>();
  const scope = params.scope === 'all' ? 'all' : 'mine';
  const view = params.view === 'board' ? 'board' : 'list';
  const [search, setSearch] = useState('');
  const query = useQuery(scope);
  // One options object per view: the board asks the server by column and the list by schedule
  // group, so they are two different sets of requests and two different stores.
  const options = useMemo<TaskListOptions>(
    () => ({ scope, view, query, search }),
    [scope, view, query, search],
  );
  const list = useTaskRowsView({ ...options, view: 'list' });
  const board = useTaskBoardView({ ...options, view: 'board' });
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
        board.phase === 'failed' && !board.columns.some((c) => c.cards.length) ? (
          // The server's own sentence, shown as it came (K5).
          <FailedState
            testID="board-failed"
            message={board.error?.message}
            onRetry={() => void reloadTaskListView(options)}
          />
        ) : board.empty === 'noMatch' ? (
          <NoMatch title={S.noMatch.title} text={S.noMatch.text} onReset={reset} />
        ) : board.empty === null && !board.columns.some((c) => c.cards.length) ? (
          <LoadingState testID="board-loading" />
        ) : (
          <TaskBoard
            mine={scope === 'mine'}
            moves={serverMoves}
            tasks={board.columns.flatMap((c) => c.cards)}
          />
        )
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
