// Touch reach of the day grid's event blocks (W3d #10): a block drawn shorter than a 44 pt target gets a hitSlop that
// grows it to 44, taken from the empty space above and below. A gap to a neighbouring block is shared half each, so
// two short blocks never claim the same strip; a block that overlaps another gets nothing on that side.

/** The smallest touch target, in points (iOS HIG; Android asks 48 dp, which the hour rows' width covers sideways). */
export const MIN_TARGET_PX = 44;

/** A block's place in the grid, in points from the top. */
export type BlockSpan = { top: number; height: number };
export type BlockSlop = { top: number; bottom: number };

/** The vertical hitSlop of each block, in the order given; `end` is the grid's height. */
export function blockSlops(spans: readonly BlockSpan[], end: number): BlockSlop[] {
  return spans.map((s, i) => {
    const need = MIN_TARGET_PX - s.height;
    if (need <= 0) return { top: 0, bottom: 0 };
    const bottom = s.top + s.height;
    const others = spans.filter((_, j) => j !== i);
    const before = others.filter((o) => o.top <= s.top).map((o) => o.top + o.height);
    const after = others.filter((o) => o.top >= s.top).map((o) => o.top);
    const above = before.length ? (s.top - Math.max(...before)) / 2 : s.top;
    const below = after.length ? (Math.min(...after) - bottom) / 2 : end - bottom;
    const room = { top: Math.max(above, 0), bottom: Math.max(below, 0) };
    // Even on both sides where there is room; what one side lacks, the other makes up.
    const top = Math.min(need / 2, room.top);
    const down = Math.min(need - top, room.bottom);
    return { top: Math.min(need - down, room.top), bottom: down };
  });
}
