// Project detail ⑨ Tasks (prototype projects.tabs.jsx ProjectsTasks): the search with the Tasks filter (scope
// `project:<id>`, Assignee in place of Project) and + New task in one bar that sticks while the list scrolls, then the
// task cards from `GET /api/app/projects/:id/tasks`. A project in Archive took its tasks along: no New task, and the
// tab says where they are.
//
// Two of the prototype's controls are not here, and both are listed in docs/phase2-gap-disembunyikan.md:
//
// - **List / Kanban.** The board this app has moves cards through the sample store (`useMoveMenu`), so handing it
//   server rows would draw a board whose drags change nothing. The board is waiting on the Tasks module's own server
//   writes; until that lands the tab shows the list alone rather than a Kanban that silently drops every move.
// - **The per-row action** ("Start working", "Request review", "Review"). The capability and the step are both on the
//   row (`can`, `primary`), but the writes behind them belong to the Tasks module and are not wired here, and the task
//   detail a user would land on is still sample data. A button that reports work it did not do is worse than none, so
//   the row opens the task instead — which is what `getProjectTasks` was already written to expect.
import { router } from 'expo-router';
import { Archive, ListTodo } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  ensureProjectTasks,
  moreProjectTasks,
  reloadProjectTasks,
  useProjectTasks,
} from '@/data/projects.detail';
import { resetQuery, useQuery } from '@/data/tasks.query-state';
import { TasksSearchField } from '@/screens/tasks';
import { useEffect } from 'react';

import { TASKS_TAB } from '../projects.strings';
import { ADDED, NAMES } from '../projects.strings.added';
import { ProjectTaskCard } from './task-card';

type ToolsProps = {
  id: string;
  search: string;
  onSearch: (text: string) => void;
  /** The project is in Archive: no New task. */
  archived: boolean;
};

/** Search + filter and + New task, on the page colour so cards scroll under it. */
export function TasksTools({ id, search, onSearch, archived }: ToolsProps) {
  return (
    <VStack testID="project-task-tools" className="gap-2 bg-background pb-2">
      <TasksSearchField
        scope={`project:${id}`}
        inProject
        value={search}
        onChangeText={onSearch}
        onFilter={() => router.push(`/projects/${id}/task-filter`)}
      />
      {!archived && (
        <HStack className="items-center justify-end">
          <Button
            size="sm"
            accessibilityLabel={NAMES.newTask}
            onPress={() => router.push({ pathname: '/tasks/new/form', params: { project: id } })}
          >
            <ButtonText>{TASKS_TAB.newTask}</ButtonText>
          </Button>
        </HStack>
      )}
    </VStack>
  );
}

type BodyProps = {
  id: string;
  search: string;
  onResetSearch: () => void;
};

/** The task cards with their count and Load more, Reset filters when nothing matches, or where archived tasks are. */
export function TasksBody({ id, search, onResetSearch }: BodyProps) {
  const scope = `project:${id}` as const;
  const query = useQuery(scope);
  const data = useProjectTasks(id, query, search);
  useEffect(() => {
    void ensureProjectTasks(id, query, search);
  }, [id, query, search]);
  if (data.phase === 'failed' && data.cards.length === 0) {
    return (
      <FailedState
        testID="project-tasks-failed"
        message={data.error?.message}
        onRetry={() => void reloadProjectTasks(id, query, search)}
      />
    );
  }
  if (data.count === null) return <LoadingState testID="project-tasks-loading" />;
  if (data.empty === 'noMatch') {
    const reset = () => {
      resetQuery(scope);
      onResetSearch();
    };
    return <NoMatch title={TASKS_TAB.noMatch} onReset={reset} />;
  }
  if (data.empty === 'none') {
    return <EmptyState testID="project-tasks-empty" icon={ListTodo} title={TASKS_TAB.none} />;
  }
  return (
    <VStack className="gap-3">
      {data.cards.map((card) => (
        <ProjectTaskCard key={card.id} t={card} />
      ))}
      <Text className="text-subhead text-muted-foreground">{data.count}</Text>
      {data.hasMore && (
        <Button
          variant="outline"
          onPress={() => void moreProjectTasks(id, query, search)}
          accessibilityLabel={ADDED.more}
        >
          <ButtonText>{ADDED.more}</ButtonText>
        </Button>
      )}
    </VStack>
  );
}

/** The tab's own empty state, for a project in Archive: its tasks went with it. */
export function ArchivedTasks() {
  return <EmptyState testID="project-tasks-archived" icon={Archive} title={ADDED.archivedTasks} />;
}
