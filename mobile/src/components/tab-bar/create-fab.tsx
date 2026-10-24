import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { createHref } from '@/navigation/create-href';
import { CREATE_MENU, type CreateTarget } from '@/navigation/tab-create';

import { BUBBLE_MS, EASE, FAB, FAB_EASE } from './tab-bar.motion';

type CreateFabProps = {
  /** What the "+" creates on this tab; null folds it away (Member on Projects). */
  target: CreateTarget | null;
};

/**
 * The round "+" beside the pill (prototype kit/layout.jsx AppTabBar, docs/phase1-navigation.md §2.4). It stays mounted
 * when there is nothing to create, so it folds away and back (width and gap, then the pill takes the room) instead of
 * popping. Folded, it is hidden from touch and screen readers.
 */
export function CreateFab({ target }: CreateFabProps) {
  const reduced = useReducedMotion();
  const shown = target !== null;
  // Folded, it keeps the last name it had (prototype: aria-label create?.label ?? 'Create').
  const label = (target ?? CREATE_MENU).label;

  const size = useSharedValue(shown ? 1 : 0);
  const opacity = useSharedValue(shown ? 1 : 0);
  const scale = useSharedValue(shown ? 1 : FAB.foldedScale);
  const pressed = useSharedValue(1);

  const was = useRef(shown);
  useEffect(() => {
    if (was.current === shown) return;
    was.current = shown;
    const to = shown ? 1 : 0;
    if (reduced) {
      // Only the fade, briefly; the width jumps.
      size.set(to);
      scale.set(1);
      opacity.set(withTiming(to, { duration: BUBBLE_MS.reduced, easing: EASE }));
      return;
    }
    size.set(withTiming(to, { duration: FAB.sizeMs, easing: FAB_EASE }));
    if (shown) {
      const fade = withTiming(1, { duration: FAB.unfold.opacityMs, easing: EASE });
      opacity.set(withDelay(FAB.unfold.opacityDelayMs, fade));
      scale.set(withTiming(1, { duration: FAB.unfold.scaleMs, easing: FAB_EASE }));
    } else {
      opacity.set(withTiming(0, { duration: FAB.fold.opacityMs, easing: EASE }));
      scale.set(withTiming(FAB.foldedScale, { duration: FAB.fold.scaleMs, easing: FAB_EASE }));
    }
  }, [shown, reduced, size, opacity, scale]);

  // Width and gap are layout, so the pill reflows into the room; the "+" is one of two items in an absolute row, and
  // the fold is rare (a Member reaching Projects), so the layout pass is cheap.
  const fold = useAnimatedStyle(() => ({
    width: size.get() * FAB.size,
    marginLeft: size.get() * FAB.gap,
    opacity: opacity.get(),
    transform: [{ scale: scale.get() * pressed.get() }],
  }));

  const press = (to: number) =>
    pressed.set(reduced ? to : withTiming(to, { duration: FAB.pressMs, easing: EASE }));

  return (
    <Animated.View
      testID="create-fab"
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      style={[{ height: FAB.size }, fold]}
    >
      {/* The round surface fills the animated box, so it narrows with it (classes stay off the Animated.View). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={!shown}
        onPressIn={() => press(FAB.pressedScale)}
        onPressOut={() => press(1)}
        onPress={() => target && router.push(createHref(target.go))}
        className="flex-1 items-center justify-center overflow-hidden rounded-full border border-border bg-card"
      >
        {/* 26 px: the prototype's TAB_ICON + 4 */}
        <Icon as={Plus} className="h-[26px] w-[26px] text-foreground" />
      </Pressable>
    </Animated.View>
  );
}
