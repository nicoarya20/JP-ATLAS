// Project detail ⑨ Tasks (prototype projects.tabs.jsx ProjectsTasks), read from `GET /api/app/tasks?scope=project`
// (tasks.list.ts, the Tasks tab's own lists): the search with the Tasks filter (Assignee in place of Project), List /
// Kanban (route param `view`, swapped in place so the project header and tabs stay) and + New task in one bar that
// sticks while the list scrolls; then the cards with Load more, or the board moving cards on the server. New task
// follows the project's `can.createTask`: shown, greyed out with the server's reason, or absent (E-6).
import { router } from 'expo-router';
import { List, ListChecks, SquareKanban } from 'lucide-react-native';

import { Seg } from '@/components/form/seg';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { capMessage } from '@/data/caps.messages';
import { taskListResource } from '@/data/tasks.api';
import { countedTasks } from '@/data/tasks.columns';
import { useTasksBoard, useTasksList } from '@/data/tasks.list';
import type { TaskScope } from '@/data/tasks.query';
import { resetQuery, useQuery } from '@/data/tasks.query-state';
import type { CapValueWire } from '@/data/tasks.wire';
import {
  type ColumnExtra,
  moveCards,
  PageFooter,
  TaskBoard,
  TasksSearchField,
} from '@/screens/tasks';

import { TASKS_TAB } from '../projects.strings';
import { NAMES } from '../projects.strings.added';
import { ProjectTaskCard } from './task-card';

export const VIEWS = ['list', 'board'] as const;
export type TasksView = (typeof VIEWS)[number];

const scopeOf = (id: string): TaskScope => `project:${id}`;
const newTask = (id: string) =>
  router.push({ pathname: '/tasks/new/form', params: { project: id } });

type ToolsProps = {
  id: string;
  view: TasksView;
  search: string;
  onSearch: (text: string) => void;
  /** The project's `can.createTask`. */
  create: CapValueWire | undefined;
};

/** Search + filter, List / Kanban and + New task, on the page colour so cards scroll under it. */
export function TasksTools({ id, view, search, onSearch, create }: ToolsProps) {
  const reason = typeof create === 'string' ? capMessage(create) : undefined;
  return (
    <VStack testID="project-task-tools" className="gap-2 bg-background pb-2">
      <TasksSearchField
        scope={scopeOf(id)}
        value={search}
        onChangeText={onSearch}
        onFilter={() => router.push(`/projects/${id}/task-filter`)}
      />
      <HStack className="items-center justify-between gap-2">
        <Seg
          testID="project-task-view"
          kind="radio"
          label={NAMES.view}
          items={TASKS_TAB.views}
          icons={[List, SquareKanban]}
          value={VIEWS.indexOf(view)}
          onChange={(i) => router.setParams({ view: VIEWS[i] ?? VIEWS[0] })}
        />
        {create !== undefined && (
          <Button
            size="sm"
            testID="project-new-task"
            isDisabled={!!reason}
            accessibilityLabel={NAMES.newTask}
            accessibilityHint={reason}
            onPress={() => newTask(id)}
          >
            <ButtonText>{TASKS_TAB.newTask}</ButtonText>
          </Button>
        )}
      </HStack>
      {reason && <Text className="text-footnote text-muted-foreground">{reason}</Text>}
    </VStack>
  );
}

type BodyProps = {
  id: string;
  view: TasksView;
  /** The search as sent (once typing rests). */
  search: string;
  canAdd: boolean;
  onReset: () => void;
};

/** The project's tasks as a list or a board; Reset clears the filter and the search. */
export function TasksBody({ view, onReset, ...rest }: BodyProps) {
  const reset = () => {
    resetQuery(scopeOf(rest.id));
    onReset();
  };
  return view === 'board' ? (
    <ProjectBoard {...rest} onReset={reset} />
  ) : (
    <ProjectList {...rest} onReset={reset} />
  );
}

type PartProps = Omit<BodyProps, 'view'>;

function ProjectList({ id, search, canAdd, onReset }: PartProps) {
  const scope = scopeOf(id);
  const data = useTasksList({ scope, query: useQuery(scope), search });
  const { page } = data;
  if (page.blank) {
    return page.phase === 'failed' ? (
      <FailedState
        testID="project-tasks-failed"
        message={page.error?.message}
        onRetry={() => void taskListResource(page.params).reload()}
      />
    ) : (
      <LoadingState testID="project-tasks-loading" />
    );
  }
  if (data.empty === 'noMatch') return <NoMatch title={TASKS_TAB.noMatch} onReset={onReset} />;
  if (data.empty === 'none') {
    return (
      <EmptyState
        testID="project-tasks-empty"
        icon={ListChecks}
        title={TASKS_TAB.empty}
        text={TASKS_TAB.emptyText}
        action={
          canAdd ? (
            <Button onPress={() => newTask(id)}>
              <ButtonText>{TASKS_TAB.newTask}</ButtonText>
            </Button>
          ) : undefined
        }
      />
    );
  }
  const group = data.groups[0];
  return (
    <VStack className="gap-3">
      {group?.tasks.map((t) => (
        <ProjectTaskCard key={t.no} t={t} />
      ))}
      <PageFooter page={page} testID="project-tasks-more" />
      {group && (
        <Text className="text-subhead text-muted-foreground">{countedTasks(group.count)}</Text>
      )}
    </VStack>
  );
}

function ProjectBoard({ id, search, canAdd, onReset }: PartProps) {
  const scope = scopeOf(id);
  const data = useTasksBoard({ scope, query: useQuery(scope), search });
  if (data.empty === 'noMatch') return <NoMatch title={TASKS_TAB.noMatch} onReset={onReset} />;
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
      mine={false}
      tasks={data.columns.flatMap((c) => c.cards)}
      onMove={moveCards}
      columns={columns}
      canAdd={canAdd}
      onAdd={() => newTask(id)}
    />
  );
}
