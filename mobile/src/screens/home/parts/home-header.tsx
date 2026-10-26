import type { Href } from 'expo-router';
import { Mic, Search } from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { TARGET_HREF } from '../home.targets';
import { StatChip } from './stat-chip';

/** Search field that opens Search; the stacked frame folds it into the header icon as the sheet scrolls over it. */
export function HomeSearch({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={S.search}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-2 rounded-control bg-muted px-3"
    >
      <Icon as={Search} size="md" className="text-muted-foreground" />
      <Text className="flex-1 text-body text-muted-foreground">{S.search}</Text>
      <Icon as={Mic} size="md" className="text-muted-foreground" />
    </Pressable>
  );
}

type HomeStatsProps = {
  stats: HomeData['stats'];
  /** The chips' line height (0 until measured) and where the first chip reports it. */
  line: number;
  onLine: (height: number) => void;
  onOpen: (href: Href) => void;
};

/** The stat chips: the StackedScreen's pinned row, scrolling sideways edge to edge (prototype .hscroll.bleed). */
export function HomeStats({ stats, line, onLine, onOpen }: HomeStatsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="gap-2 px-4"
    >
      {stats.map((s, i) => (
        <StatChip
          key={s.key}
          stat={s}
          first={i === 0}
          line={line}
          onLine={i === 0 ? onLine : undefined}
          onPress={() => onOpen(TARGET_HREF[s.target])}
        />
      ))}
    </ScrollView>
  );
}
