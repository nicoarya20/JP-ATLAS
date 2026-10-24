// The list view of My tasks and All tasks (prototype tasks.list.jsx TasksMy, TasksAll, TasksEmpty): group headings
// with their count, then the cards; "No tasks for you yet." with New task, or "No tasks match these filters."
import { ListChecks, Plus } from 'lucide-react-native';

import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCardGroup, TasksEmpty } from '@/data/tasks';

import { S } from '../tasks.strings';
import { AllCard } from './all-card';
import { MyCard } from './my-card';

type TaskListProps = {
  mine: boolean;
  groups: readonly TaskCardGroup[];
  empty: TasksEmpty;
  onOpen: (no: number) => void;
  onNew: () => void;
  onReset: () => void;
};

/** Grouped cards of one list, or its empty state. */
export function TaskList({ mine, groups, empty, onOpen, onNew, onReset }: TaskListProps) {
  if (empty === 'none') {
    return (
      <EmptyState
        testID="tasks-empty"
        icon={ListChecks}
        iconLabel={S.empty.icon}
        title={S.empty.title}
        text={S.empty.text}
        action={
          <Button onPress={onNew}>
            <ButtonIcon as={Plus} />
            <ButtonText>{S.empty.action}</ButtonText>
          </Button>
        }
      />
    );
  }
  if (empty === 'noMatch')
    return <NoMatch title={S.noMatch.title} text={S.noMatch.text} onReset={onReset} />;
  const Card = mine ? MyCard : AllCard;
  return groups.map((g) => (
    <VStack key={g.title ?? 'all'} className="gap-3">
      {g.title && (
        <HStack className="items-baseline gap-2 pt-2">
          <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
            {g.title}
          </Text>
          <Text className="text-headline text-muted-foreground">{g.tasks.length}</Text>
        </HStack>
      )}
      {g.tasks.map((t) => (
        <Card key={t.no} card={t} onOpen={onOpen} />
      ))}
    </VStack>
  ));
}
