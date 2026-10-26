import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface } from './glass-surface';
import { FAB_EASE, keyframes, PANEL, PANEL_CLOSE_EASE, SPRING, SWELL } from './tab-bar.motion';

/** Half the 58 px pill: a pill while folded, a card with round corners once the panel is open. */
const SHELL_RADIUS = 29;

const PanelContext = createContext({ open: false, reduced: false });
/** Whether the panel around is open, for its children's rise (PanelRise). */
export const usePanel = () => useContext(PanelContext);

type TabShellProps = {
  open: boolean;
  /** Screen reader name of the panel ("More"). */
  label: string;
  panel: ReactNode;
  /** The screen reader's escape (two-finger Z on iOS) folds the panel. */
  onEscape: () => void;
  /** The pill. */
  children: ReactNode;
};

/**
 * The surface around the pill (prototype .tb-shell): the panel unfolds upward out of it into a card, 0 → its content's
 * height, while the shell swells once like a drop (from its bottom edge); folding is faster and does not swell
 * (docs/phase1-navigation.md §2.5). The panel stays mounted, so it is measured and folds both ways; folded, it is out
 * of touch and out of the screen reader's reach.
 */
export function TabShell({ open, label, panel, onEscape, children }: TabShellProps) {
  const reduced = useReducedMotion();
  const content = useSharedValue(0);
  const height = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  const opened = useRef(open);
  useEffect(() => {
    if (opened.current === open) return;
    opened.current = open;
    height.set(
      open
        ? withTiming(content.get(), { duration: PANEL.openMs, easing: FAB_EASE })
        : withTiming(0, { duration: PANEL.closeMs, easing: PANEL_CLOSE_EASE }),
    );
    if (open && !reduced) {
      sx.set(
        keyframes(
          SWELL.map(([at, x]) => [at, x] as const),
          PANEL.swellMs,
          SPRING,
        ),
      );
      sy.set(
        keyframes(
          SWELL.map(([at, , y]) => [at, y] as const),
          PANEL.swellMs,
          SPRING,
        ),
      );
    }
  }, [open, reduced, content, height, sx, sy]);

  // Height is layout, so the shell grows with it; it is a short, absolute card that opens a few times a session.
  const unfold = useAnimatedStyle(() => ({ height: height.get() }));
  const swell = useAnimatedStyle(() => ({
    transform: [{ scaleX: sx.get() }, { scaleY: sy.get() }],
  }));

  return (
    <Animated.View
      testID="tab-shell-swell"
      style={[{ flex: 1, transformOrigin: '50% 100%' }, swell]}
    >
      <GlassSurface
        testID="tab-shell"
        radius={SHELL_RADIUS}
        open={open}
        onAccessibilityEscape={open ? onEscape : undefined}
      >
        <Animated.View
          testID="tab-panel"
          role="group"
          accessibilityLabel={label}
          pointerEvents={open ? 'box-none' : 'none'}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          style={[{ overflow: 'hidden' }, unfold]}
        >
          <View
            testID="tab-panel-content"
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              content.set(h);
              // Text size changed while open: follow it.
              if (opened.current) height.set(h);
            }}
          >
            <PanelContext.Provider value={{ open, reduced }}>{panel}</PanelContext.Provider>
          </View>
        </Animated.View>
        {children}
      </GlassSurface>
    </Animated.View>
  );
}
