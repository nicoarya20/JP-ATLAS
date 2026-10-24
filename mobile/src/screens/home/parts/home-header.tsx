import { Mic, Search } from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import type { OpenTarget } from '../home.targets';
import { StatChip } from './stat-chip';

/** Greeting title with my avatar. */
export function HomeTitle({ greeting, me }: Pick<HomeData, 'greeting' | 'me'>) {
  return (
    <HStack className="items-center justify-between gap-3 px-4 pb-3 pt-2">
      <Text accessibilityRole="header" className="flex-1 text-page font-semibold">
        {S.greeting(greeting, me.name)}
      </Text>
      <Avatar className="h-11 w-11 bg-accent">
        <AvatarFallbackText className="text-subhead font-semibold text-accent-foreground">
          {me.full}
        </AvatarFallbackText>
      </Avatar>
    </HStack>
  );
}

/** Search field that opens Search. */
export function HomeSearch({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={S.search}
      onPress={onPress}
      className="mx-4 mb-3 min-h-11 flex-row items-center gap-2 rounded-control bg-muted px-3"
    >
      <Icon as={Search} size="md" className="text-muted-foreground" />
      <Text className="flex-1 text-body text-muted-foreground">{S.search}</Text>
      <Icon as={Mic} size="md" className="text-muted-foreground" />
    </Pressable>
  );
}

/** The stat chips row: scrolls sideways and stays pinned under the header as the page scrolls. */
export function HomeStats({
  stats,
  onOpen,
}: {
  stats: HomeData['stats'];
  onOpen: (target: OpenTarget) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="rounded-t-modal bg-background"
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {stats.map((s, i) => (
        <StatChip key={s.key} stat={s} first={i === 0} onPress={() => onOpen(s.target)} />
      ))}
    </ScrollView>
  );
}
