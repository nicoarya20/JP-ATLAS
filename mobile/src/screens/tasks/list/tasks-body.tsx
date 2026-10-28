// The two bodies of the Tasks tab, read from /api/app/tasks: the list (groups, Load more, loading and failure) and the
// board (columns with their server counts and Load more each, moves on the server). A board emptied by the filters or
// search says so with Reset, as the list does (UX §4).
import { router } from 'expo-router';

import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { moveOnServer, taskListResource } from '@/data/tasks.api';
import { serverMoveNotice } from '@/data/tasks.columns';
import { useTasksBoard, useTasksList } from '@/data/tasks.list';
import type { ServerScope, TaskQuery } from '@/data/tasks.query';

import { type BoardMove, type ColumnExtra, TaskBoard } from '../board/task-board';
import { S } from '../tasks.strings';
import { PageFooter } from './page-footer';
import { TaskList } from './task-list';

/** Moves cards on the server and words the outcome. */
const moveCards: BoardMove = async (cards, to) =>
  serverMoveNotice(cards.length > 1, to, await moveOnServer(cards, to));

export type BodyProps = {
  scope: ServerScope;
  query: TaskQuery;
  search: string;
  onReset: () => void;
};

export function ServerList({ scope, query, search, onReset }: BodyProps) {
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

export function ServerBoard({ scope, query, search, onReset }: BodyProps) {
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
