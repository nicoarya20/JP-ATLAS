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
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { usePinnedProgress } from '@/components/screen/stacked-context';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { StatChip as Stat, StatKey } from '@/data/home.types';
import { MIN_TARGET, SPACING } from '@/theme/tokens';

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

/** Chip geometry (prototype .hm-stat-in): the icon box (h-6), padding tall → compact, and the gaps that fold away. */
const CHIP = {
  icon: 24,
  iconGap: 4,
  lineGap: 2,
  pad: SPACING.sm,
  compact: SPACING.xs,
  end: 20,
  endCompact: SPACING.md,
} as const;
/**
 * Vertical hitSlop of a chip whose label line is `line` pt (0 = not measured yet, still tall). Compact, a chip is one
 * line between two small paddings, under 44 pt: its touch area grows into the gaps above and below, its look stays.
 */
export const statSlop = (line: number) => {
  const v = line ? Math.max(0, (MIN_TARGET - (2 * CHIP.compact + line)) / 2) : 0;
  return { top: v, bottom: v };
};

/** Tall: the top padding makes room for the icon above the label. */
const TALL_TOP = CHIP.pad + CHIP.icon + CHIP.iconGap;

/** px a chip loses when compact, given its measured line height: Home's StackedScreen pinnedShrink. */
export const statFold = (line: number) =>
  TALL_TOP - CHIP.compact + (CHIP.pad - CHIP.compact) + CHIP.lineGap + line;

const lerp = (from: number, to: number, q: number) => {
  'worklet';
  return from + (to - from) * q;
};

type StatChipProps = {
  stat: Stat;
  first: boolean;
  /** The label's line height once measured (0 before): the sub line folds by it and the icon centres on it. */
  line: number;
  /** Reports the label's line height (one chip is enough: they share the type). */
  onLine?: (height: number) => void;
  onPress: () => void;
};

/**
 * Stat chip: icon over label + count over the sub line (red when it needs attention); the first chip is highlighted.
 * As the pinned row compacts (usePinnedProgress) it becomes one line: the icon slides to the middle of the left edge,
 * the padding moves its room to the left and the sub line folds away, every height linear in the progress.
 */
export function StatChip({ stat, first, line, onLine, onPress }: StatChipProps) {
  const q = usePinnedProgress();
  const label = STAT_LABEL[stat.key];
  const sub = statSub(stat.sub);
  const inner = useAnimatedStyle(() => {
    const p = q.get();
    return {
      paddingTop: lerp(TALL_TOP, CHIP.compact, p),
      paddingBottom: lerp(CHIP.pad, CHIP.compact, p),
      paddingLeft: lerp(CHIP.pad, CHIP.pad + CHIP.icon + CHIP.compact, p),
      paddingRight: lerp(CHIP.end, CHIP.endCompact, p),
    };
  });
  const icon = useAnimatedStyle(() => {
    const middle = line ? CHIP.compact + (line - CHIP.icon) / 2 : CHIP.pad;
    return { top: lerp(CHIP.pad, middle, q.get()) };
  });
  // Unmeasured, the sub line keeps its own height; it fades out over the first half of the fold.
  const fold = useAnimatedStyle(() => {
    const p = q.get();
    const height = line ? { height: line * (1 - p) } : {};
    return { ...height, marginTop: CHIP.lineGap * (1 - p), opacity: Math.max(0, 1 - 2 * p) };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${stat.count === null ? '' : ` ${stat.count}`}, ${sub}`}
      onPress={onPress}
      hitSlop={statSlop(line)}
      className={`rounded-card data-[active=true]:opacity-70 ${first ? 'bg-accent' : 'bg-card'}`}
    >
      <Animated.View testID="stat-chip-in" style={inner}>
        <Animated.View
          style={[icon, { left: CHIP.pad, width: CHIP.icon, height: CHIP.icon }]}
          className={`absolute items-center justify-center rounded-control ${first ? 'bg-atlas' : 'bg-muted'}`}
        >
          <Icon
            as={STAT_ICON[stat.key]}
            size="xs"
            className={first ? 'text-card' : 'text-foreground'}
          />
        </Animated.View>
        <Text
          numberOfLines={1}
          onLayout={(e) => onLine?.(e.nativeEvent.layout.height)}
          className="text-subhead font-semibold"
        >
          {label}
          {stat.count !== null && (
            <Text className="text-subhead font-normal">{` ${stat.count}`}</Text>
          )}
        </Text>
        <Animated.View testID="stat-sub" style={fold} className="overflow-hidden">
          <Text
            numberOfLines={1}
            className={`text-subhead ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {sub}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
