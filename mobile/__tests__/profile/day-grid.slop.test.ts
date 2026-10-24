import { blockSlops, MIN_TARGET_PX } from '../../src/screens/profile/day-grid.slop';

// test-only: a 24 × 56 pt grid.
const END = 1344;

describe('blockSlops', () => {
  test('a block of 44 or more gets none', () => {
    expect(blockSlops([{ top: 100, height: MIN_TARGET_PX }], END)).toEqual([{ top: 0, bottom: 0 }]);
  });

  test('a lone short block grows evenly to 44', () => {
    expect(blockSlops([{ top: 100, height: 28 }], END)).toEqual([{ top: 8, bottom: 8 }]);
  });

  test('at the top of the grid the missing room is made up below', () => {
    expect(blockSlops([{ top: 2, height: 28 }], END)).toEqual([{ top: 2, bottom: 14 }]);
  });

  test('two short blocks share the gap between them, half each, and never meet', () => {
    const [a, b] = blockSlops(
      [
        { top: 100, height: 28 },
        { top: 138, height: 28 },
      ],
      END,
    );
    // The 10 pt gap gives each 5; the far sides make up the rest.
    expect(a).toEqual({ top: 11, bottom: 5 });
    expect(b).toEqual({ top: 5, bottom: 11 });
    expect(100 + 28 + a.bottom).toBeLessThanOrEqual(138 - b.top);
  });

  test('blocks that overlap get nothing on the overlapping side', () => {
    const [a, b] = blockSlops(
      [
        { top: 100, height: 28 },
        { top: 110, height: 28 },
      ],
      END,
    );
    expect(a).toEqual({ top: 16, bottom: 0 });
    expect(b).toEqual({ top: 0, bottom: 16 });
  });
});
