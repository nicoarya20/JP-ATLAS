// The Kanban move menu (prototype tasks.radial.menu.jsx): the four statuses around a ring over the dimmed screen, at
// the finger. Drawn in a gluestack Portal (the overlay host above the tab bar), not an RN Modal: a Modal opens a new
// native window, which cancels the touch still being held on iOS. While the finger holds it lets every touch through;
// sticky, it takes taps (a status, or the dim to close; Android back closes too); closing, it plays out for
// MOTION.closeMs and is already hidden from assistive tech.
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Portal } from '@/components/ui/portal';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { COLUMNS } from '@/data/tasks.columns';
import { MOTION } from '@/data/tasks.radial';
import { SPACING } from '@/theme/tokens';

import { S } from '../tasks.strings';
import { MoveStack } from './move-stack';
import { RadialOption } from './radial-option';
import { RadialRing } from './radial-ring';
import type { MoveMenu } from './use-move-menu';

/** Dim, ring and hint fade (tasks.css tk-radial-out). */
const OUT_MS = 180;

/** The open (or closing) move menu of a board. */
export function RadialMenu({ menu: m }: { menu: MoveMenu }) {
  const { bottom } = useSafeAreaInsets();
  const shown = m.menu ?? m.closing?.menu;
  if (!shown) return null;
  const closing = !m.menu;
  const lit = closing ? (m.closing?.picked ?? null) : m.aim;
  const n = shown.nos.length;
  const fade = m.reduced
    ? null
    : closing
      ? ({
          animationName: { to: { opacity: 0 } },
          animationDuration: OUT_MS,
          animationFillMode: 'forwards',
        } as const)
      : ({
          animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
          animationDuration: MOTION.fadeMs,
        } as const);
  return (
    <Portal isOpen onRequestClose={m.close} style={StyleSheet.absoluteFill}>
      <View
        testID="radial-menu"
        accessibilityViewIsModal={!closing}
        accessibilityLabel={S.radial.dialog(shown.group, n, shown.title)}
        accessibilityElementsHidden={closing}
        importantForAccessibility={closing ? 'no-hide-descendants' : 'auto'}
        pointerEvents={closing || !shown.sticky ? 'none' : 'auto'}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[StyleSheet.absoluteFill, fade]}>
          <Pressable
            testID="radial-dim"
            accessibilityRole="button"
            accessibilityLabel={S.radial.close}
            onPress={m.close}
            className="flex-1 bg-veil"
          />
        </Animated.View>
        <View
          className="absolute h-0 w-0 items-center justify-center"
          style={{ left: shown.x, top: shown.y }}
        >
          <Animated.View className="h-0 w-0 items-center justify-center" style={fade}>
            <RadialRing
              group={shown.group}
              tone={
                lit && shown.allowed.includes(lit)
                  ? (COLUMNS.find((c) => c.status === lit)?.tone ?? null)
                  : null
              }
              angle={m.values.angle}
            />
          </Animated.View>
          {shown.stack && (
            <MoveStack
              stack={shown.stack}
              closing={closing}
              to={closing ? lit : null}
              reduced={m.reduced}
            />
          )}
          {COLUMNS.map((c) => (
            <RadialOption
              key={c.status}
              column={c}
              group={shown.group}
              now={c.status === shown.from}
              off={c.status !== shown.from && !shown.allowed.includes(c.status)}
              lit={lit === c.status}
              closing={closing}
              reduced={m.reduced}
              onPick={() => m.pick(c.status)}
            />
          ))}
        </View>
        <Animated.View
          pointerEvents="none"
          className="absolute left-4 right-4 items-center gap-0.5 rounded-card bg-card px-4 py-3 shadow-md"
          style={[{ bottom: bottom + SPACING.xl }, fade]}
        >
          <Text className="text-center text-subhead font-semibold text-foreground">
            {S.radial.head(shown.group, n, shown.title)}
          </Text>
          <Text className="text-center text-footnote text-muted-foreground">
            {shown.sticky ? S.radial.tap(shown.group) : S.radial.hold}
          </Text>
        </Animated.View>
      </View>
    </Portal>
  );
}
