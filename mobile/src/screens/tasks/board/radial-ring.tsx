// The move menu's ring (prototype tasks.radial.menu.jsx svg .tk-radial-ring): a circle around the finger, or around
// the group's stack, with a quarter arc that turns toward the slide and takes the tone of the status aimed at.
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

import type { BoardTone } from '@/data/tasks.columns';
import { RING_PAD, RING_PX } from '@/data/tasks.radial';

import { TONE_VAR } from './board.tones';

/** Ring stroke (tasks.css .tk-radial-ring stroke-width). */
const STROKE = 5;

type RadialRingProps = {
  group: boolean;
  /** Tone of the status aimed at; null = no arc. */
  tone: BoardTone | null;
  /** Slide angle in degrees (0 = right), from the card's gesture. */
  angle: SharedValue<number>;
};

/** Ring with the aim arc, centred in its zero-size parent. */
export function RadialRing({ group, tone, angle }: RadialRingProps) {
  const size = group ? RING_PX.group : RING_PX.one;
  const half = size / 2;
  const r = half - RING_PAD;
  const c = 2 * Math.PI * r;
  const [ring, arc] = useCSSVariable(['--color-border', tone ? TONE_VAR[tone] : '--color-atlas']);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get() - 45}deg` }] }));
  const box = { position: 'absolute', width: size, height: size } as const;
  return (
    <>
      <Svg width={size} height={size} style={box} pointerEvents="none">
        <Circle cx={half} cy={half} r={r} fill="none" stroke={String(ring)} strokeWidth={STROKE} />
      </Svg>
      {tone && (
        <Animated.View testID="radial-arc" pointerEvents="none" style={[box, turn]}>
          <Svg width={size} height={size}>
            <Circle
              cx={half}
              cy={half}
              r={r}
              fill="none"
              stroke={String(arc)}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${c / 4} ${c}`}
            />
          </Svg>
        </Animated.View>
      )}
    </>
  );
}
