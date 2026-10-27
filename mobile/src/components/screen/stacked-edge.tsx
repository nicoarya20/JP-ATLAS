// Rounded top edge of a StackedScreen without a pinned row (Projects, Events). It sticks under the header like the
// pinned row does: a canvas band as deep as the content's top padding (so at rest it hides nothing, and scrolled content
// passes under a canvas strip, never touching the header), with the surface painted outside the two 24 pt corner arcs.
// Below the band it is see-through, so the arcs run their full depth without covering the first row.
import { View } from 'react-native';

import { SPACING } from '@/theme/tokens';

/** Corner radius and the edge's height (prototype 24 px), the same depth as the pinned row's corners. */
export const EDGE = SPACING.lg;

/** The canvas band: the content's top padding, where its first row starts. */
export const EDGE_BAND = SPACING.md;

/** Border thick enough to cover the corner box outside the arc (its diagonal is ≈ 0.42 × EDGE). */
const RING = EDGE;

/** One corner: a ring whose inner edge is the arc, clipped to an EDGE × EDGE box. */
function Corner({ side }: { side: 'left' | 'right' }) {
  return (
    <View
      className="absolute top-0 overflow-hidden"
      style={{ width: EDGE, height: EDGE, [side]: 0 }}
    >
      <View
        className="absolute border-card"
        style={{
          top: -RING,
          [side]: -RING,
          width: 2 * (EDGE + RING),
          height: 2 * (EDGE + RING),
          borderRadius: EDGE + RING,
          borderWidth: RING,
        }}
      />
    </View>
  );
}

/** The sticky sheet edge; it never takes a touch. */
export function StackedEdge() {
  return (
    <View testID="stacked-edge" pointerEvents="none" style={{ height: EDGE }}>
      <View className="absolute inset-x-0 top-0 bg-background" style={{ height: EDGE_BAND }} />
      <Corner side="left" />
      <Corner side="right" />
    </View>
  );
}
