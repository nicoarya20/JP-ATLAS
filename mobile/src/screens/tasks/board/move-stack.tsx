// Group move stack (prototype tasks.radial.stack.jsx, tasks.css .tk-stack*): the picked cards fly from their places on
// the board to the finger and pile up under it as mini cards, the held one on top, with a count badge. Moved, the pile
// flies off toward the status; cancelled, each card flies back to its place. The keyframes are the prototype's, run
// as Reanimated CSS animations; reduced motion drops them.
import { View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { type BoardStatus, SIDE_OF_STATUS } from '@/data/tasks.columns';
import { MOTION, stackPose } from '@/data/tasks.radial';

import type { StackCard } from './move-menu.state';

const AWAY = {
  up: [0, -MOTION.stackAwayPx],
  right: [MOTION.stackAwayPx, 0],
  down: [0, MOTION.stackAwayPx],
  left: [-MOTION.stackAwayPx, 0],
} as const;
const STACK_IN = cubicBezier(0.2, 0.8, 0.2, 1);
/** Count badge fade-in (tasks.css .tk-stack-count) and fade-out on cancel. */
const COUNT = { inMs: 200, delayMs: 150, outMs: 120 } as const;

/** Card on the pile, or where it sits on the board (straight, large, see-through). */
const pose = (i: number) => {
  const { tilt, lift } = stackPose(i);
  return {
    opacity: 1,
    transform: [{ translateX: 0 }, { translateY: lift }, { rotate: `${tilt}deg` }, { scale: 1 }],
  };
};
const board = (c: StackCard, opacity: number) => ({
  opacity,
  transform: [
    { translateX: c.dx },
    { translateY: c.dy },
    { rotate: '0deg' },
    { scale: MOTION.stackFromScale },
  ],
});

function cardMotion(c: StackCard, i: number, back: boolean) {
  if (back) {
    return {
      animationName: { from: pose(i), to: board(c, 0) },
      animationDuration: MOTION.stackBackMs,
      animationTimingFunction: 'ease-in',
      animationFillMode: 'forwards',
    } as const;
  }
  return {
    animationName: { from: board(c, 0.6), to: pose(i) },
    animationDuration: MOTION.stackInMs,
    animationDelay: i * MOTION.stackStaggerMs,
    animationTimingFunction: STACK_IN,
    animationFillMode: 'backwards',
  } as const;
}

type MoveStackProps = {
  stack: readonly StackCard[];
  /** The menu is closing: to = the status the pile moved to, null = cancelled. */
  closing: boolean;
  to: BoardStatus | null;
  reduced: boolean;
};

/** The pile of a group move, centred on the menu (inside its zero-size wheel). */
export function MoveStack({ stack, closing, to, reduced }: MoveStackProps) {
  const back = closing && !to;
  const [tx, ty] = to ? AWAY[SIDE_OF_STATUS[to]] : [0, 0];
  const away =
    closing && to && !reduced
      ? ({
          animationName: {
            to: { opacity: 0, transform: [{ translateX: tx }, { translateY: ty }, { scale: 0.5 }] },
          },
          animationDuration: MOTION.stackAwayMs,
          animationTimingFunction: 'ease-in',
          animationFillMode: 'forwards',
        } as const)
      : null;
  return (
    <Animated.View
      testID="move-stack"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center"
      style={[{ transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] }, away]}
    >
      {stack.map((c, i) => (
        <Animated.View
          key={c.no}
          className="absolute w-[88px] gap-px rounded-control bg-card p-1.5 shadow-md"
          style={[{ zIndex: stack.length - i }, pose(i), reduced ? null : cardMotion(c, i, back)]}
        >
          <Text className="text-[8px] leading-tight text-muted-foreground">#{c.no}</Text>
          <Text className="text-[9px] font-semibold leading-tight text-foreground">{c.title}</Text>
        </Animated.View>
      ))}
      <View className="absolute -top-10 left-8 z-50">
        <Animated.View
          className="h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5"
          style={
            reduced
              ? null
              : back
                ? {
                    animationName: { to: { opacity: 0 } },
                    animationDuration: COUNT.outMs,
                    animationFillMode: 'forwards',
                  }
                : {
                    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
                    animationDuration: COUNT.inMs,
                    animationDelay: COUNT.delayMs,
                    animationFillMode: 'backwards',
                  }
          }
        >
          <Text className="text-footnote font-bold text-primary-foreground">{stack.length}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
