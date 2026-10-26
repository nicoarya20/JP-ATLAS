// The list view of My tasks and All tasks (prototype tasks.list.jsx TasksMy, TasksAll, TasksEmpty): group headings
// with their count (one stop: "Overdue, 2 tasks"), then the cards; "No tasks for you yet." with New task, or "No tasks
// match these filters."
import { ListChecks, Plus } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskListGroupView, TasksEmpty } from '@/data/tasks.api.view';
import { tasksCount } from '@/data/tasks.columns';

import { S } from '../tasks.strings';
import { AllCard } from './all-card';
import { MyCard } from './my-card';

type TaskListProps = {
  mine: boolean;
  groups: readonly TaskListGroupView[];
  empty: TasksEmpty;
  /** Hidden when the server says the viewer may not add a task (`caps.createTask`, B5). */
  mayCreate: boolean;
  onOpen: (no: number) => void;
  onNew: () => void;
  onReset: () => void;
  /** Ask the server for the next page of one group. */
  onMore: (key: string) => void;
};

/** Grouped cards of one list, or its empty state. */
export function TaskList({
  mine,
  groups,
  empty,
  mayCreate,
  onOpen,
  onNew,
  onReset,
  onMore,
}: TaskListProps) {
  if (empty === 'none') {
    return (
      <EmptyState
        testID="tasks-empty"
        icon={ListChecks}
        iconLabel={S.empty.icon}
        title={S.empty.title}
        text={S.empty.text}
        action={
          mayCreate ? (
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
  return groups.map((g) => {
    // The server's own count when it sends one, not the number of rows loaded so far: with paging
    // those are different numbers, and the heading means the first one.
    const total = g.count ?? g.cards.length;
    return (
      <VStack key={g.key} className="gap-3">
        {g.title && (
          <HStack
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${g.title}, ${tasksCount(total)}`}
            className="items-baseline gap-2 pt-2"
          >
            <Text className="text-headline font-semibold text-foreground">{g.title}</Text>
            <Text className="text-headline text-muted-foreground">{total}</Text>
          </HStack>
        )}
        {g.cards.map((t) => (
          <Card key={t.no} card={t} onOpen={onOpen} />
        ))}
        {g.hasMore && (
          <Button testID={`tasks-more-${g.key}`} variant="outline" onPress={() => onMore(g.key)}>
            <ButtonText>{S.more}</ButtonText>
          </Button>
        )}
      </VStack>
    );
  });
}
