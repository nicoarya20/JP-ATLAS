// One status of the move menu (prototype tasks.radial.menu.jsx, tasks.css .tk-radial-opt): a pill on its side of the
// ring that pops in after the ones before it, grows and fills with its tone while aimed at, and on close folds back
// into the ring, or swells away when it is the status picked. The task's own status is marked Now and is off.
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { BoardColumn } from '@/data/tasks.columns';
import { MOTION, OPTION_RADIUS } from '@/data/tasks.radial';

import { S } from '../tasks.strings';
import { STATUS_ICON, TONE_FILL, TONE_SOFT } from './board.tones';

const ORDER = { up: 0, right: 1, down: 2, left: 3 } as const;
const UNIT = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
/** Aim and fill changes (tasks.css .tk-radial-opt transition). */
const AIM_MS = 120;

type RadialOptionProps = {
  column: BoardColumn;
  group: boolean;
  now: boolean;
  /** Filled: aimed at while open, the picked status while closing. */
  lit: boolean;
  closing: boolean;
  reduced: boolean;
  onPick: () => void;
};

/** A status option, centred on its point of the ring. */
export function RadialOption({
  column,
  group,
  now,
  lit,
  closing,
  reduced,
  onPick,
}: RadialOptionProps) {
  const r = group ? OPTION_RADIUS.group : OPTION_RADIUS.one;
  const [ux, uy] = UNIT[column.side];
  const tone = lit && !now ? TONE_FILL[column.tone] : TONE_SOFT[column.tone];
  const scale = lit && !now && !reduced ? MOTION.aimScale : 1;
  const motion = reduced
    ? null
    : closing
      ? ({
          animationName: lit
            ? { to: { opacity: 0, transform: [{ scale: 1.3 }] } }
            : { to: { opacity: 0, transform: [{ scale: 0.6 }] } },
          animationDuration: lit ? MOTION.swellMs : MOTION.foldMs,
          animationTimingFunction: lit ? 'ease-out' : 'ease-in',
          animationFillMode: 'forwards',
        } as const)
      : ({
          animationName: {
            from: { opacity: 0, transform: [{ scale: 0.6 }] },
            to: { opacity: 1, transform: [{ scale }] },
          },
          animationDuration: MOTION.optionMs,
          animationDelay: ORDER[column.side] * MOTION.optionStaggerMs,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'backwards',
        } as const);
  return (
    <View
      className="absolute h-0 w-0 items-center justify-center"
      style={{ transform: [{ translateX: ux * r }, { translateY: uy * r }] }}
    >
      <Animated.View
        style={[
          { transform: [{ scale }], transitionProperty: 'transform', transitionDuration: AIM_MS },
          motion,
        ]}
      >
        <Pressable
          testID={`radial-${column.status}`}
          accessibilityRole="button"
          accessibilityLabel={now ? `${column.status} ${S.radial.now}` : column.status}
          accessibilityState={{ disabled: now, selected: now }}
          disabled={now}
          onPress={onPick}
          className={`shadow-md ${tone.bg} ${now ? 'opacity-60' : ''} ${
            group
              ? 'min-h-[52px] items-center justify-center rounded-card px-3 py-2'
              : 'min-h-11 rounded-full px-3'
          }`}
        >
          <HStack className={group ? 'flex-col items-center gap-1' : 'min-h-11 items-center gap-1'}>
            <Icon as={STATUS_ICON[column.status]} size="md" className={tone.text} />
            <Text
              numberOfLines={1}
              className={`${group ? 'text-footnote' : 'text-subhead'} font-semibold ${tone.text}`}
            >
              {column.status}
              {now && (
                <Text className="text-footnote font-normal text-muted-foreground">
                  {' '}
                  {S.radial.now}
                </Text>
              )}
            </Text>
          </HStack>
        </Pressable>
      </Animated.View>
    </View>
  );
}
