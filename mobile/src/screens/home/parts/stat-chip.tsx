import {
  CalendarDays,
  CircleCheck,
  Clock,
  FolderOpen,
  Hourglass,
  Inbox,
  type LucideIcon,
  TriangleAlert,
  UserCheck,
} from 'lucide-react-native';

import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { StatChip as Stat, StatKey } from '@/data/home.types';

import { STAT_LABEL, statSub } from '../home.strings';

const STAT_ICON: Record<StatKey, LucideIcon> = {
  assigned: UserCheck,
  inProgress: Clock,
  completed: CircleCheck,
  upcoming: CalendarDays,
  inbox: Inbox,
  active: FolderOpen,
  overdue: TriangleAlert,
  awaiting: Hourglass,
};

type StatChipProps = { stat: Stat; first: boolean; onPress: () => void };

/** Stat chip: icon over label + count over the sub line (red when it needs attention); the first chip is highlighted. */
export function StatChip({ stat, first, onPress }: StatChipProps) {
  const label = STAT_LABEL[stat.key];
  const sub = statSub(stat.sub);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${stat.count === null ? '' : ` ${stat.count}`}, ${sub}`}
      onPress={onPress}
      className={`gap-1 rounded-card p-3 pr-5 data-[active=true]:opacity-70 ${first ? 'bg-accent' : 'bg-card'}`}
    >
      <Box
        className={`h-6 w-6 items-center justify-center rounded-control ${first ? 'bg-atlas' : 'bg-muted'}`}
      >
        <Icon
          as={STAT_ICON[stat.key]}
          size="xs"
          className={first ? 'text-card' : 'text-foreground'}
        />
      </Box>
      <Text className="text-subhead font-semibold">
        {label}
        {stat.count !== null && (
          <Text className="text-subhead font-normal">{` ${stat.count}`}</Text>
        )}
      </Text>
      <Text className={`text-subhead ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}>
        {sub}
      </Text>
    </Pressable>
  );
}
