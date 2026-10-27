// Facts of a task (prototype tasks.detail.jsx baseFacts): the assignee with an avatar, the due date with how late it
// is, priority, type, Needs review, the reviewer, and who created it. No tag row: the server has no column for tags and
// refuses them with 422 (A2), and no second assignee either (A1) — both are in docs/phase2-gap-disembunyikan.md.
import { View } from 'react-native';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { type Fact, Facts } from '@/components/list/facts';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskDetailFact } from '@/data/tasks.api.detail';

import { S } from '../tasks.strings';

function factValue(f: TaskDetailFact): Fact[1] {
  switch (f.key) {
    case 'assignee':
      // Nobody assigned is a real answer from the server, so it is said rather than left blank.
      if (!f.people.length)
        return <Text className="text-subhead text-foreground">{S.detail.unassigned}</Text>;
      return (
        <VStack className="gap-1">
          {f.people.map((p) => (
            <HStack key={p.name} className="items-center gap-2">
              {/* The name beside it says who; the avatar would say it again. */}
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <AvatarStack names={[p.name]} label={p.full} />
              </View>
              <Text className="text-subhead font-semibold text-foreground">{p.full}</Text>
            </HStack>
          ))}
        </VStack>
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
export function DetailFacts({ facts }: { facts: readonly TaskDetailFact[] }) {
  return <Facts testID="task-facts" facts={facts.map((f) => [f.label, factValue(f)] as const)} />;
}
