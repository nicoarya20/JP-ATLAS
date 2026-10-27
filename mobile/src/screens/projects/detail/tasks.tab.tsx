// Project detail ⑨ Tasks (prototype projects.tabs.jsx ProjectsTasks): the search with the Tasks filter (scope
// `project:<id>`, Assignee in place of Project), List / Kanban (route param `view`, swapped in place so the project
// header and tabs stay) and + New task in one bar that sticks while the list scrolls; then the cards or the board.
// A project in Archive took its tasks along: no New task, and the tab says where they are.
import { router } from 'expo-router';
import { Archive, List, SquareKanban } from 'lucide-react-native';

import { Seg } from '@/components/form/seg';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { getProjectTasks } from '@/data/projects';
import type { Role } from '@/data/sample';
import { resetQuery } from '@/data/tasks.query-state';
import { TaskBoard, TasksSearchField } from '@/screens/tasks';

import { TASKS_TAB } from '../projects.strings';
import { ADDED, NAMES } from '../projects.strings.added';
import { ProjectTaskCard } from './task-card';

export const VIEWS = ['list', 'board'] as const;
export type TasksView = (typeof VIEWS)[number];

type ToolsProps = {
  id: string;
  view: TasksView;
  search: string;
  onSearch: (text: string) => void;
  /** The project is in Archive: no New task. */
  archived: boolean;
};

/** Search + filter, List / Kanban and + New task, on the page colour so cards scroll under it. */
export function TasksTools({ id, view, search, onSearch, archived }: ToolsProps) {
  return (
    <VStack testID="project-task-tools" className="gap-2 bg-background pb-2">
      <TasksSearchField
        scope={`project:${id}`}
        inProject
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
        {!archived && (
          <Button
            size="sm"
            accessibilityLabel={NAMES.newTask}
            onPress={() => router.push({ pathname: '/tasks/new/form', params: { project: id } })}
          >
            <ButtonText>{TASKS_TAB.newTask}</ButtonText>
          </Button>
        )}
      </HStack>
    </VStack>
  );
}

type BodyProps = {
  id: string;
  role: Role;
  data: ReturnType<typeof getProjectTasks>;
  archived: boolean;
  onReset: () => void;
};

/** The task cards with their count, the board, Reset filters when nothing matches, or where archived tasks are. */
export function TasksBody({ id, role, data, archived, onReset }: BodyProps) {
  if (archived) {
    return (
      <EmptyState testID="project-tasks-archived" icon={Archive} title={ADDED.archivedTasks} />
    );
  }
  if (data.empty === 'noMatch') {
    const reset = () => {
      resetQuery(`project:${id}`);
      onReset();
    };
    return <NoMatch title={TASKS_TAB.noMatch} onReset={reset} />;
  }
  if (data.view === 'board') return <TaskBoard tasks={data.cards} role={role} mine={false} />;
  return (
    <VStack className="gap-3">
      {data.rows.map(({ card, action }) => (
        <ProjectTaskCard key={card.no} t={card} action={action} />
      ))}
      <Text className="text-subhead text-muted-foreground">{data.count}</Text>
    </VStack>
  );
}
