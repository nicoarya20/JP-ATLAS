import { BUBBLE_PAD, clamp, nearest, posAt } from '../../src/navigation/bubble.math';
import { runOnWorkletRuntime } from '../helpers/worklet-runtime';

// A 5-tab pill 300 px wide: with the 4 px padding each tab is (300 − 8) / 5 = 58.4 px.
const WIDTH = 300;
const N = 5;
const TAB = (WIDTH - 2 * BUBBLE_PAD) / N;
const centre = (i: number) => BUBBLE_PAD + TAB * (i + 0.5);

describe('posAt', () => {
  it('puts the bubble on the tab whose centre is under the finger', () => {
    for (let i = 0; i < N; i++) expect(posAt(centre(i), WIDTH, N, -1)).toBeCloseTo(i);
  });

  it('gives a fractional position between two tab centres', () => {
    expect(posAt((centre(1) + centre(2)) / 2, WIDTH, N, -1)).toBeCloseTo(1.5);
  });

  it('clamps past either edge to the first or last tab', () => {
    expect(posAt(-40, WIDTH, N, -1)).toBe(0);
    expect(posAt(0, WIDTH, N, -1)).toBe(0);
    expect(posAt(WIDTH + 40, WIDTH, N, -1)).toBe(N - 1);
  });

  it('returns the fallback while the pill has no width', () => {
    expect(posAt(120, 0, N, 3)).toBe(3);
  });

  // The tab bar's pan calls it on the UI thread from the first touch; a value it fails to capture aborts the app there.
  it('runs on the worklet runtime with only what it captured', () => {
    expect(runOnWorkletRuntime(posAt, centre(2), WIDTH, N, -1)).toBeCloseTo(2);
    expect(runOnWorkletRuntime(posAt, 120, 0, N, 3)).toBe(3);
  });
});

describe('nearest', () => {
  it('settles on the closest tab', () => {
    expect(nearest(0.49)).toBe(0);
    expect(nearest(0.5)).toBe(1);
    expect(nearest(3.2)).toBe(3);
  });
});

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(-1, 0, 4)).toBe(0);
    expect(clamp(2.5, 0, 4)).toBe(2.5);
    expect(clamp(9, 0, 4)).toBe(4);
  });
});
