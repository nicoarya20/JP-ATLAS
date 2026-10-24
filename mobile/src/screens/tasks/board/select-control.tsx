// Grey control at the right of every column head (prototype tasks.board.jsx SelectControl): Select starts picking
// cards on the whole board and Cancel ends it. While on, a select-all icon slides out from behind it and picks every
// card in this column the viewer may change, or drops them when all are picked already.
import { CheckCheck } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { MOTION } from '@/data/tasks.radial';
import { SPACING } from '@/theme/tokens';

import { S } from '../tasks.strings';

/** Select-all sits this far right (on top of Select: its 44 px target plus the gap) while hidden. */
const HIDDEN_SHIFT = 44 + SPACING.xs;
const EASE = Easing.bezier(...MOTION.selectAllBezier);

type SelectControlProps = {
  on: boolean;
  status: string;
  /** Every pickable card of the column is picked; none can be (disabled). */
  all: boolean;
  canAll: boolean;
  onToggle: () => void;
  onAll: () => void;
};

/** Select / Cancel with the column's select-all beside it. */
export function SelectControl({ on, status, all, canAll, onToggle, onAll }: SelectControlProps) {
  const reduced = useReducedMotion();
  const slide = useAnimatedStyle(() => {
    const timing = { duration: reduced ? 0 : MOTION.selectAllMs, easing: EASE };
    return {
      opacity: withTiming(on ? 1 : 0, timing),
      transform: [
        { translateX: withTiming(on ? 0 : HIDDEN_SHIFT, timing) },
        { scale: withTiming(on || reduced ? 1 : 0.6, timing) },
      ],
    };
  });
  return (
    <View className="flex-row items-center gap-2">
      <Animated.View
        style={slide}
        pointerEvents={on ? 'auto' : 'none'}
        accessibilityElementsHidden={!on}
        importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}
      >
        <Pressable
          testID={`select-all-${status}`}
          accessibilityRole="button"
          accessibilityLabel={S.board.selectAll(all, status)}
          accessibilityState={{ selected: all, disabled: !canAll }}
          disabled={!canAll}
          onPress={onAll}
          className="h-11 w-11 items-center justify-center"
        >
          <View className="rounded-control bg-card p-1">
            <Icon
              as={CheckCheck}
              size="sm"
              className={
                !canAll
                  ? 'text-muted-foreground opacity-50'
                  : all
                    ? 'text-atlas'
                    : 'text-muted-foreground'
              }
            />
          </View>
        </Pressable>
      </Animated.View>
      <Pressable
        testID={`select-${status}`}
        accessibilityRole="button"
        accessibilityLabel={on ? S.board.cancel : S.board.select}
        onPress={onToggle}
        className="z-10 min-h-11 justify-center"
      >
        <View className="rounded-control bg-card px-2 py-0.5">
          <Text className="text-footnote font-semibold text-muted-foreground">
            {on ? S.board.cancel : S.board.select}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
