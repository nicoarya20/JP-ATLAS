// Project detail ⑨ Tasks (prototype projects.tabs.jsx ProjectsTasks): the search with the Tasks filter (scope
// `project:<id>`, Assignee in place of Project), List / Kanban (route param `view`, swapped in place so the project
// header and tabs stay) and + New task in one bar that sticks while the list scrolls; then the cards or the board.
import { router } from 'expo-router';
import { List, SquareKanban } from 'lucide-react-native';

import { Seg } from '@/components/form/seg';
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
import { ProjectTaskCard } from './task-card';

export const VIEWS = ['list', 'board'] as const;
export type TasksView = (typeof VIEWS)[number];

type ToolsProps = { id: string; view: TasksView; search: string; onSearch: (text: string) => void };

/** Search + filter, List / Kanban and + New task, on the page colour so cards scroll under it. */
export function TasksTools({ id, view, search, onSearch }: ToolsProps) {
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
          items={TASKS_TAB.views}
          icons={[List, SquareKanban]}
          value={VIEWS.indexOf(view)}
          onChange={(i) => router.setParams({ view: VIEWS[i] ?? VIEWS[0] })}
        />
        <Button
          size="sm"
          onPress={() => router.push({ pathname: '/tasks/new/form', params: { project: id } })}
        >
          <ButtonText>{TASKS_TAB.newTask}</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}

type BodyProps = {
  id: string;
  role: Role;
  data: ReturnType<typeof getProjectTasks>;
  onReset: () => void;
};

/** The task cards with their count, the board, or Reset filters when nothing matches. */
export function TasksBody({ id, role, data, onReset }: BodyProps) {
  if (data.view === 'board') return <TaskBoard tasks={data.cards} role={role} mine={false} />;
  if (!data.cards.length) {
    const reset = () => {
      resetQuery(`project:${id}`);
      onReset();
    };
    return <NoMatch title={TASKS_TAB.noMatch} onReset={reset} />;
  }
  return (
    <VStack className="gap-3">
      {data.rows.map(({ card, action }) => (
        <ProjectTaskCard key={card.no} t={card} action={action} />
      ))}
      <Text className="text-subhead text-muted-foreground">{data.count}</Text>
    </VStack>
  );
}
