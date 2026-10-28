// The Tasks tab (prototype tasks.list.jsx ListScreen, tasks.board.jsx TasksBoard), read from /api/app/tasks: the
// stacked header with the search and the Filter & sort icon, the My tasks / All tasks and List / Kanban switches pinned
// under it (route params `scope` and `view`), then the list or the board. Switching My / All starts the other list from
// its own default query; List / Kanban keeps it. Typing searches once the text rests (SEARCH_WAIT_MS), so a word is one
// request, not one per letter. A board emptied by the filters or search says so with Reset, as the list does (UX §4).
import { router, useLocalSearchParams } from 'expo-router';
import { List, SquareKanban } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Seg } from '@/components/form/seg';
import { StackedScreen } from '@/components/screen/stacked-screen';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { HStack } from '@/components/ui/hstack';
import { moveOnServer, taskListResource } from '@/data/tasks.api';
import { serverMoveNotice } from '@/data/tasks.columns';
import { useTasksBoard, useTasksList } from '@/data/tasks.list';
import type { ServerScope, TaskQuery } from '@/data/tasks.query';
import { resetQuery, useQuery } from '@/data/tasks.query-state';

import { type BoardMove, type ColumnExtra, TaskBoard } from '../board/task-board';
import { TasksSearchField } from '../filter/tasks-search';
import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { PageFooter } from './page-footer';
import { TaskList } from './task-list';

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

/** Moves cards on the server and words the outcome. */
const moveCards: BoardMove = async (cards, to) =>
  serverMoveNotice(cards.length > 1, to, await moveOnServer(cards, to));

type BodyProps = { scope: ServerScope; query: TaskQuery; search: string; onReset: () => void };

function ServerList({ scope, query, search, onReset }: BodyProps) {
  const data = useTasksList({ scope, query, search });
  const { page } = data;
  if (page.blank) {
    return page.phase === 'failed' ? (
      <FailedState
        testID="tasks-failed"
        message={page.error?.message}
        onRetry={() => void taskListResource(page.params).reload()}
      />
    ) : (
      <LoadingState testID="tasks-loading" />
    );
  }
  return (
    <TaskList
      mine={scope === 'mine'}
      groups={data.groups}
      empty={data.empty}
      canAdd={data.canAdd}
      footer={<PageFooter page={page} testID="tasks-more" />}
      onOpen={(no) => router.push(`/tasks/${no}`)}
      onNew={() => router.push('/tasks/new')}
      onReset={onReset}
    />
  );
}

function ServerBoard({ scope, query, search, onReset }: BodyProps) {
  const data = useTasksBoard({ scope, query, search });
  if (data.empty === 'noMatch') {
    return <NoMatch title={S.noMatch.title} text={S.noMatch.text} onReset={onReset} />;
  }
  const columns = Object.fromEntries(
    data.columns.map((c): [string, ColumnExtra] => [
      c.status,
      {
        count: c.count,
        footer: c.page && <PageFooter page={c.page} testID={`column-more-${c.status}`} />,
      },
    ]),
  );
  return (
    <TaskBoard
      mine={scope === 'mine'}
      tasks={data.columns.flatMap((c) => c.cards)}
      onMove={moveCards}
      columns={columns}
      canAdd={data.canAdd}
    />
  );
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
