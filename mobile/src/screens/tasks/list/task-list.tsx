// The list view of My tasks and All tasks (prototype tasks.list.jsx TasksMy, TasksAll, TasksEmpty): group headings
// with their count (one stop: "Overdue, 2 tasks"), then the cards and what the screen puts under them (Load more);
// "No tasks for you yet." with New task (when the server lets the viewer add one), or "No tasks match these filters."
import { ListChecks, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { countedTasks } from '@/data/tasks.columns';
import type { TaskGroupView, TasksEmpty } from '@/data/tasks.list';

import { S } from '../tasks.strings';
import { AllCard } from './all-card';
import { MyCard } from './my-card';

type TaskListProps = {
  mine: boolean;
  groups: readonly TaskGroupView[];
  empty: TasksEmpty;
  /** New task in the empty state. */
  canAdd: boolean;
  footer?: ReactNode;
  onOpen: (no: number) => void;
  onNew: () => void;
  onReset: () => void;
};

/** Grouped cards of one list, or its empty state. */
export function TaskList({
  mine,
  groups,
  empty,
  canAdd,
  footer,
  onOpen,
  onNew,
  onReset,
}: TaskListProps) {
  if (empty === 'none') {
    return (
      <EmptyState
        testID="tasks-empty"
        icon={ListChecks}
        iconLabel={S.empty.icon}
        title={mine ? S.empty.title : S.empty.allTitle}
        text={mine ? S.empty.text : S.empty.allText}
        action={
          canAdd ? (
            <Button onPress={onNew}>
              <ButtonIcon as={Plus} />
              <ButtonText>{S.empty.action}</ButtonText>
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (empty === 'noMatch')
    return <NoMatch title={S.noMatch.title} text={S.noMatch.text} onReset={onReset} />;
  const Card = mine ? MyCard : AllCard;
  const rows = groups.map((g) => (
    <VStack key={g.key} className="gap-3">
      {g.title && (
        <HStack
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${g.title}, ${countedTasks(g.count)}`}
          className="items-baseline gap-2 pt-2"
        >
          <Text className="text-headline font-semibold text-foreground">{g.title}</Text>
          <Text className="text-headline text-muted-foreground">{g.count}</Text>
        </HStack>
      )}
      {g.tasks.map((t) => (
        <Card key={t.no} card={t} onOpen={onOpen} />
      ))}
    </VStack>
  ));
  return (
    <>
      {rows}
      {footer}
    </>
  );
}
