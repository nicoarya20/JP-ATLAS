import type { Href } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { TARGET_HREF } from '../home.targets';
import { ListRow } from '../parts/list-row';
import { SectionCard } from '../parts/section-card';
import { EmptyLine, SeeAll } from '../parts/small-parts';

type DoneSectionProps = { done: HomeData['done']; onOpen: (href: Href) => void };

/** Tasks Completed This Week: green check, task, who and when; See all opens my tasks. */
export function DoneSection({ done, onOpen }: DoneSectionProps) {
  return (
    <SectionCard title={S.done.title}>
      {done.length === 0 && <EmptyLine>{S.done.empty}</EmptyLine>}
      {done.map((d) => (
        <ListRow
          key={d.title}
          title={d.title}
          lead={<Icon as={CircleCheck} size="lg" className="text-success" />}
          right={<Text className="text-footnote text-muted-foreground">{d.who}</Text>}
        />
      ))}
      <SeeAll onPress={() => onOpen(TARGET_HREF['tasks.my'])} />
    </SectionCard>
  );
}

/** Latest Activity: violet bullet, what happened, where and when. */
export function ActivitySection({ activity }: { activity: HomeData['activity'] }) {
  return (
    <SectionCard title={S.activity.title}>
      {activity.length === 0 && <EmptyLine>{S.activity.empty}</EmptyLine>}
      {activity.map((a) => (
        <HStack key={a.title} className="gap-3">
          <Box className="mt-2 h-2 w-2 rounded-full bg-atlas" />
          <VStack className="flex-1 gap-1">
            <Text className="text-body">{a.title}</Text>
            <Text className="text-footnote text-muted-foreground">{a.meta}</Text>
          </VStack>
        </HStack>
      ))}
    </SectionCard>
  );
}
