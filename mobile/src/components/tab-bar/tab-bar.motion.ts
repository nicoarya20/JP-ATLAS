// Durations, curves and keyframes of the tab bar, from the prototype's kit/tabbar.css and styles/app.css
// (docs/phase1-navigation.md §2.3–2.5, §2.8). Components take them from here instead of retyping numbers.
import { Easing, withSequence, withTiming } from 'react-native-reanimated';

/** --tb-spring: overshoots a little, then settles. */
export const SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
/** CSS `ease`. */
export const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
/** CSS `ease-out`. */
export const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);

/** --fab-ease: the "+" folding away and back (an iOS sheet curve). */
export const FAB_EASE = Easing.bezier(0.32, 0.72, 0, 1);

/** The "+" (styles/app.css .glassbar-fab): 60 px round, 10 px from the pill; folds to nothing where it creates nothing. */
export const FAB = {
  size: 60,
  gap: 10,
  /** Scale while folded, and while pressed. */
  foldedScale: 0.6,
  pressedScale: 0.94,
  /** Width and gap, both ways. */
  sizeMs: 380,
  pressMs: 220,
  unfold: { opacityMs: 220, opacityDelayMs: 120, scaleMs: 380 },
  fold: { opacityMs: 160, scaleMs: 260 },
} as const;

/** The More panel folding shut (Material standard curve): faster than it opens, no swell. */
export const PANEL_CLOSE_EASE = Easing.bezier(0.4, 0, 0.2, 1);

/** The More panel (kit/tabbar.css .tb-panel, .tb-rise, styles/app.css .glassbar-scrim). */
export const PANEL = {
  /** Height 0 → content: opening uses FAB_EASE, closing PANEL_CLOSE_EASE. */
  openMs: 480,
  closeMs: 300,
  swellMs: 560,
  scrimMs: 280,
  /** Each child floats in after 90 + i × 28 ms. */
  rise: {
    delayMs: 90,
    stepMs: 28,
    opacityMs: 240,
    moveMs: 460,
    closeOpacityMs: 120,
    closeMoveMs: 160,
    y: 14,
    scale: 0.88,
  },
} as const;

/** [offset 0..1, scale x, scale y] of the shell's swell as the panel opens (prototype @keyframes tb-swell). */
export const SWELL: readonly (readonly [number, number, number])[] = [
  [0, 1, 1],
  [0.35, 1.03, 0.98],
  [0.65, 0.99, 1.01],
  [1, 1, 1],
];

/** Bubble timings in ms. */
export const BUBBLE_MS = {
  slide: 420,
  heldMove: 240,
  heldScale: 260,
  release: 320,
  shadow: 220,
  drag: 90,
  jelly: 600,
  pop: 480,
  icon: 260,
  /** Reduced motion: the bubble only slides, briefly. */
  reduced: 120,
} as const;

/** Finger down: the bubble lifts like a lens, the lit icon grows. */
export const HELD = { x: 1.16, y: 1.12, icon: 1.12 } as const;

/** [offset 0..1, scale x, scale y] of the jelly bounce (prototype @keyframes tb-jelly). */
export const JELLY: readonly (readonly [number, number, number])[] = [
  [0, 1.16, 1.12],
  [0.3, 1.22, 0.86],
  [0.55, 0.92, 1.08],
  [0.75, 1.04, 0.97],
  [1, 1, 1],
];

/** [offset 0..1, scale] of the lit icon's pop (prototype @keyframes tb-pop). */
export const POP: readonly (readonly [number, number])[] = [
  [0, 0.85],
  [0.6, 1.12],
  [1, 1],
];

/**
 * A CSS keyframe animation as a Reanimated sequence: jump to the first value, then one timing per interval. `easing`
 * applies per interval, as CSS `animation-timing-function` does.
 */
export function keyframes(
  frames: readonly (readonly [number, number])[],
  totalMs: number,
  easing: typeof EASE,
) {
  'worklet';
  const steps = [withTiming(frames[0][1], { duration: 0 })];
  for (let i = 1; i < frames.length; i++) {
    const duration = (frames[i][0] - frames[i - 1][0]) * totalMs;
    steps.push(withTiming(frames[i][1], { duration, easing }));
  }
  return withSequence(...steps);
}
