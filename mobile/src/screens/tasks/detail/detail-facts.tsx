// Facts of a task (prototype tasks.detail.jsx baseFacts): the assignee with an avatar (or Unassigned), the due date with
// how late it is, priority, type, phase, Needs review and its reviewer when the task has them, and who created it.
import { View } from 'react-native';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { type Fact, Facts } from '@/components/list/facts';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { DETAIL_TEXT, type DetailFact } from '@/data/tasks.detail';

function factValue(f: DetailFact): Fact[1] {
  switch (f.key) {
    case 'assignee':
      if (!f.name) return DETAIL_TEXT.unassigned;
      return (
        <HStack className="items-center gap-2">
          {/* The name beside it says who; the avatar would say it again. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AvatarStack names={[f.name]} />
          </View>
          <Text className="text-subhead font-semibold text-foreground">{f.name}</Text>
        </HStack>
      );
    case 'due':
      return (
        <Text className="text-subhead font-semibold text-foreground">
          {f.value}
          {f.note ? <Text className="font-normal text-muted-foreground"> {f.note}</Text> : null}
        </Text>
      );
    default:
      return f.value;
  }
}

/** The facts list of the detail. */
export function DetailFacts({ facts }: { facts: readonly DetailFact[] }) {
  return <Facts testID="task-facts" facts={facts.map((f) => [f.label, factValue(f)] as const)} />;
}
