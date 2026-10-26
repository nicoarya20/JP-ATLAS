// Facts of a task (prototype tasks.detail.jsx baseFacts): each assignee with an avatar, the due date with how late it
// is, priority, type, Needs review, the reviewer, the tags as outline pills (or "—", read "No tags") and who created
// it.
import { View } from 'react-native';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { type Fact, Facts } from '@/components/list/facts';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskFact } from '@/data/tasks.detail';

import { SPOKEN } from '../tasks.strings.added';

const NO_TAGS = '—';

function factValue(f: TaskFact): Fact[1] {
  switch (f.key) {
    case 'assignee':
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
    case 'tags':
      if (!f.tags.length)
        return (
          <Text accessibilityLabel={SPOKEN.noTags} className="text-subhead text-foreground">
            {NO_TAGS}
          </Text>
        );
      return (
        <HStack className="flex-wrap gap-1">
          {f.tags.map((t) => (
            <Badge key={t} variant="outline">
              <BadgeText>{t}</BadgeText>
            </Badge>
          ))}
        </HStack>
      );
    default:
      return f.value;
  }
}

/** The facts list of the detail. */
export function DetailFacts({ facts }: { facts: readonly TaskFact[] }) {
  return <Facts testID="task-facts" facts={facts.map((f) => [f.label, factValue(f)] as const)} />;
}
