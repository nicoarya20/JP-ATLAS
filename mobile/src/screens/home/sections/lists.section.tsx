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
import { WidgetPart } from '../parts/widget-card';

type DoneSectionProps = {
  done: HomeData['done'];
  onOpen: (href: Href) => void;
  onRetry: () => void;
};

/** Tasks Completed This Week: green check, task, and who finished it when, in the server's words. */
export function DoneSection({ done, onOpen, onRetry }: DoneSectionProps) {
  return (
    <SectionCard title={S.done.title}>
      <WidgetPart section={done} onRetry={onRetry} testID="done-failed">
        {(rows) => (
          <>
            {rows.length === 0 && <EmptyLine>{S.done.empty}</EmptyLine>}
            {rows.map((d) => (
              <ListRow
                key={d.id}
                title={d.title}
                lead={<Icon as={CircleCheck} size="lg" className="text-success" />}
                right={<Text className="text-footnote text-muted-foreground">{d.who}</Text>}
              />
            ))}
          </>
        )}
      </WidgetPart>
      <SeeAll onPress={() => onOpen(TARGET_HREF['tasks.my'])} />
    </SectionCard>
  );
}

/** Latest Activity: violet bullet, what happened (the server's sentence), where and when. */
export function ActivitySection({
  activity,
  onRetry,
}: {
  activity: HomeData['activity'];
  onRetry: () => void;
}) {
  return (
    <SectionCard title={S.activity.title}>
      <WidgetPart section={activity} onRetry={onRetry} testID="activity-failed">
        {(rows) => (
          <>
            {rows.length === 0 && <EmptyLine>{S.activity.empty}</EmptyLine>}
            {rows.map((a) => (
              <HStack key={a.id} className="gap-3">
                <Box className="mt-2 h-2 w-2 rounded-full bg-atlas" />
                <VStack className="flex-1 gap-1">
                  <Text className="text-body">{a.text}</Text>
                  <Text className="text-footnote text-muted-foreground">{a.meta}</Text>
                </VStack>
              </HStack>
            ))}
          </>
        )}
      </WidgetPart>
    </SectionCard>
  );
}
